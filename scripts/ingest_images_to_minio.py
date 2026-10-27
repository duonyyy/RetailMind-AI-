"""
RetailMind AI — Product Image Ingestion to MinIO (Python Edition)

Đặc tả kỹ thuật:
- Đọc `products_detail.json`
- Async / ThreadPool tải ảnh từ CDN TGDD với Rate-Limiting chống 429
- Xác thực Magic Bytes (JPEG/PNG/WebP)
- Đẩy lên MinIO S3 bucket `retailmind-products`
- Lưu bảng ánh xạ URL MinIO vào `data/product_image_mapping.json`
"""

import os
import sys
import json
import time
import hashlib
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error

ROOT_DIR = Path(__file__).resolve().parent.parent
possible_data_paths = [
    ROOT_DIR / "data" / "products_detail.json",
    ROOT_DIR / "data" / "catalog" / "products_detail.json",
    ROOT_DIR / "tynaai neoai main apps-data" / "products_detail.json",
]
JSON_DATA_PATH = next((p for p in possible_data_paths if p.exists()), possible_data_paths[0])
OUTPUT_MAPPING_PATH = ROOT_DIR / "data" / "product_image_mapping.json"

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
BUCKET_NAME = os.getenv("MINIO_BUCKET", "retailmind-products")


def detect_image_type(data: bytes):
    if len(data) >= 3 and data[0:3] == b"\xff\xd8\xff":
        return "image/jpeg", "jpg"
    if len(data) >= 8 and data[0:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png", "png"
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None, None


def download_image(url: str, max_retries: int = 3) -> tuple[bytes, str, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RetailMindAI/1.0",
        "Accept": "image/*,*/*;q=0.8",
    }
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                content = response.read()
                mime, ext = detect_image_type(content)
                if not mime:
                    raise ValueError("Nội dung nhị phân không phải ảnh hợp lệ (Magic bytes không khớp)")
                return content, mime, ext
        except Exception as e:
            if attempt == max_retries:
                raise e
            time.sleep(attempt * 1.5)
    raise RuntimeError("Tải ảnh thất bại sau nhiều lần thử")


def main():
    parser = argparse.ArgumentParser(description="Tải ảnh sản phẩm từ JSON và đẩy vào MinIO")
    parser.add_argument("--limit", type=int, default=20, help="Số lượng ảnh cần xử lý (mặc định: 20)")
    parser.add_argument("--category", type=str, default="", help="Lọc theo tên danh mục (vd: Laptop)")
    parser.add_argument("--all", action="store_true", help="Chạy toàn bộ 13,754 sản phẩm")
    parser.add_argument("--concurrency", type=int, default=8, help="Số luồng đồng thời (mặc định: 8)")
    args = parser.parse_args()

    print("=" * 65)
    print("🚀 RETAILMIND AI — PYTHON MINIO IMAGE INGESTION PIPELINE")
    print("=" * 65)

    if not JSON_DATA_PATH.exists():
        print(f"[Lỗi] Không tìm thấy tệp: {JSON_DATA_PATH}")
        sys.exit(1)

    try:
        from minio import Minio
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
        if not client.bucket_exists(BUCKET_NAME):
            client.make_bucket(BUCKET_NAME)
            print(f"[MinIO] Đã tạo bucket mới: {BUCKET_NAME}")
        
        # Thiết lập Read-Only policy cho products/
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadProducts",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{BUCKET_NAME}/products/*"],
                }
            ],
        }
        try:
            client.set_bucket_policy(BUCKET_NAME, json.dumps(policy))
            print(f"[MinIO] Đã cấu hình Public Read Policy cho {BUCKET_NAME}")
        except Exception as pe:
            print(f"[MinIO] Cảnh báo policy: {pe}")
            
    except ImportError:
        print("[Lỗi] Chưa cài thư viện `minio`. Hãy chạy `pip install minio` hoặc dùng script Node.js `node scripts/ingest_images_to_minio.js`.")
        sys.exit(1)

    print(f"[Data] Đang đọc {JSON_DATA_PATH}...")
    with open(JSON_DATA_PATH, "r", encoding="utf-8") as f:
        products = json.load(f)

    if args.category:
        kw = args.category.strip().lower()
        products = [p for p in products if kw in (p.get("category_name") or "").lower() or kw in (p.get("tên sản phẩm") or "").lower()]
        print(f"[Filter] Đã lọc theo '{args.category}': còn {len(products)} sản phẩm")

    products = [p for p in products if p.get("url_image") and p["url_image"].startswith("http")]

    if not args.all and args.limit:
        products = products[: args.limit]
        print(f"[Limit] Xử lý đợt này: {len(products)} sản phẩm")

    print(f"\nBắt đầu tải và lưu trữ vào MinIO (Luồng: {args.concurrency})...")
    start_time = time.time()
    mapping_results = []
    import io

    def process_item(item):
        raw_sku = item.get("productcode") or item.get("product_id")
        safe_sku = "".join(c for c in str(raw_sku) if c.isalnum() or c in "_-")
        original_url = item["url_image"]
        object_key = f"products/{safe_sku}.jpg"

        # Idempotency check
        try:
            stat = client.stat_object(BUCKET_NAME, object_key)
            if stat and stat.size > 0:
                return {
                    "product_id": item.get("product_id"),
                    "sku": item.get("productcode"),
                    "name": item.get("tên sản phẩm"),
                    "original_url": original_url,
                    "minio_object_key": object_key,
                    "minio_url": f"http://{MINIO_ENDPOINT}/{BUCKET_NAME}/{object_key}",
                    "size_bytes": stat.size,
                    "status": "SKIPPED_EXISTING",
                }
        except Exception:
            pass

        # Download & Upload
        try:
            content, mime, ext = download_image(original_url)
            sha256 = hashlib.sha256(content).hexdigest()
            client.put_object(
                BUCKET_NAME,
                object_key,
                io.BytesIO(content),
                len(content),
                content_type=mime,
                metadata={
                    "Original-Url": original_url,
                    "Sha256": sha256,
                    "Product-Id": str(item.get("product_id", "")),
                },
            )
            return {
                "product_id": item.get("product_id"),
                "sku": item.get("productcode"),
                "name": item.get("tên sản phẩm"),
                "original_url": original_url,
                "minio_object_key": object_key,
                "minio_url": f"http://{MINIO_ENDPOINT}/{BUCKET_NAME}/{object_key}",
                "size_bytes": len(content),
                "checksum_sha256": sha256,
                "status": "UPLOADED_SUCCESS",
            }
        except Exception as e:
            return {
                "product_id": item.get("product_id"),
                "sku": item.get("productcode"),
                "original_url": original_url,
                "status": "FAILED",
                "error": str(e),
            }

    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = [executor.submit(process_item, p) for p in products]
        done_count = 0
        for f in as_completed(futures):
            res = f.result()
            mapping_results.append(res)
            done_count += 1
            if done_count % 10 == 0 or done_count == len(products):
                print(f"  [Tiến độ: {done_count}/{len(products)}]")

    OUTPUT_MAPPING_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MAPPING_PATH, "w", encoding="utf-8") as f:
        json.dump(mapping_results, f, ensure_ascii=False, indent=2)

    dur = time.time() - start_time
    print("=" * 65)
    print(f"✅ HOÀN TẤT TRONG {dur:.1f} GIÂY!")
    print(f"  - File mapping: {OUTPUT_MAPPING_PATH}")
    print(f"  - MinIO Console: http://localhost:9001 (Bucket: {BUCKET_NAME})")
    print("=" * 65)


if __name__ == "__main__":
    main()
