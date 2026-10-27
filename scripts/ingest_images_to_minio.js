/**
 * RetailMind AI — Product Image Ingestion to MinIO Object Storage
 *
 * Tính năng:
 * 1. Đọc tệp tynaai neoai main apps-data/products_detail.json (13,754 sản phẩm).
 * 2. Lọc URL hợp lệ (CDN Thế Giới Di Động / Điện Máy Xanh).
 * 3. Kiểm soát Concurrency (Semaphore 8 luồng) chống 429 Rate-Limit CDN.
 * 4. Kiểm tra Magic Bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: RIFF..WEBP).
 * 5. Tải và đẩy lên MinIO S3 bucket `retailmind-products`.
 * 6. Tính Idempotency (nếu object đã tồn tại trên MinIO -> tự động BỎ QUA).
 * 7. Xuất file ánh xạ `data/product_image_mapping.json` để nạp vào PostgreSQL / Qdrant.
 *
 * Cách chạy:
 *   - Chế độ Test Laptop (khuyến nghị ban đầu):
 *       node scripts/ingest_images_to_minio.js --category="Laptop" --limit=20
 *   - Chế độ Test 50 sản phẩm đầu tiên:
 *       node scripts/ingest_images_to_minio.js --limit=50
 *   - Chế độ Full toàn bộ 13,754 sản phẩm:
 *       node scripts/ingest_images_to_minio.js --all
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve MinIO client from core-api or apps/backend node_modules
let Minio;
const possiblePaths = [
  path.resolve(__dirname, '../core-api/node_modules/minio'),
  path.resolve(__dirname, '../apps/backend/node_modules/minio'),
  'minio',
];
for (const p of possiblePaths) {
  try {
    Minio = require(p);
    break;
  } catch (e) {}
}
if (!Minio) {
  console.error('LỖI: Không tìm thấy thư viện minio. Hãy chắc chắn đã chạy `npm install` trong core-api.');
  process.exit(1);
}

// Cấu hình MinIO
const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
};

const BUCKET_NAME = process.env.MINIO_BUCKET || 'retailmind-products';

// Tìm đường dẫn products_detail.json thực tế trong dự án
const possibleDataPaths = [
  path.resolve(__dirname, '../data/products_detail.json'),
  path.resolve(__dirname, '../data/catalog/products_detail.json'),
  path.resolve(__dirname, '../tynaai neoai main apps-data/products_detail.json'),
];
const JSON_DATA_PATH = possibleDataPaths.find((p) => fs.existsSync(p)) || possibleDataPaths[0];
const OUTPUT_MAPPING_PATH = path.resolve(__dirname, '../data/product_image_mapping.json');

// Parse CLI flags
const args = process.argv.slice(2);
let limit = null;
let categoryFilter = null;
let isFull = false;

args.forEach((arg) => {
  if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--category=')) {
    categoryFilter = arg.split('=')[1].trim().toLowerCase();
  } else if (arg === '--all') {
    isFull = true;
  }
});

if (!isFull && limit === null && !categoryFilter) {
  limit = 20; // Mặc định chạy thử 20 ảnh nếu không chỉ định cờ
}

// Kiểm tra Magic Bytes nhị phân hợp lệ
function detectContentType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// Thiết lập MinIO Bucket Public Read Policy để Web Client xem được ảnh
async function ensureBucketWithPublicPolicy(minioClient, bucketName) {
  const exists = await minioClient.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(`[MinIO] Đã khởi tạo bucket mới: ${bucketName}`);
  }

  // Cấu hình Anonymous Read Policy cho thư mục products/
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadProducts',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/products/*`],
      },
    ],
  };

  try {
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    console.log(`[MinIO] Đã thiết lập Public Read Policy cho bucket: ${bucketName}`);
  } catch (err) {
    console.warn(`[MinIO] Cảnh báo khi cấu hình bucket policy: ${err.message}`);
  }
}

// Hàm tải ảnh an toàn với timeout và kiểm tra Content-Type
async function downloadImageWithRetry(url, maxRetries = 3) {
  // Tự động ánh xạ về CDN nguồn cdnv2.tgdd.vn để tải ảnh thực tế
  const targetUrl = url
    .replace('https://cdn.retailmind.vn', 'https://cdnv2.tgdd.vn')
    .replace('https://cdn.tgdd.vn', 'https://cdnv2.tgdd.vn')
    .replace('http://cdn.retailmind.vn', 'https://cdnv2.tgdd.vn')
    .replace('http://cdn.tgdd.vn', 'https://cdnv2.tgdd.vn');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: 'https://www.thegioididong.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const typeInfo = detectContentType(buffer);
      if (!typeInfo) {
        throw new Error('Dữ liệu nhị phân không phải ảnh hợp lệ (Magic bytes không khớp)');
      }

      return { buffer, ...typeInfo };
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoffMs = attempt * 1500 + Math.random() * 500;
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }
}

// Quản lý Concurrency Pool
async function pMap(items, mapper, concurrency = 8) {
  const results = [];
  let index = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        const res = await mapper(items[currentIndex], currentIndex);
        results[currentIndex] = res;
      } catch (err) {
        results[currentIndex] = { error: err.message };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('='.repeat(65));
  console.log('🚀 RETAILMIND AI — MINIO IMAGE INGESTION PIPELINE');
  console.log('='.repeat(65));

  if (!fs.existsSync(JSON_DATA_PATH)) {
    console.error(`[Lỗi] Không tìm thấy tệp dữ liệu: ${JSON_DATA_PATH}`);
    process.exit(1);
  }

  const minioClient = new Minio.Client(MINIO_CONFIG);
  await ensureBucketWithPublicPolicy(minioClient, BUCKET_NAME);

  console.log(`[Data] Đang đọc ${JSON_DATA_PATH}...`);
  const rawData = fs.readFileSync(JSON_DATA_PATH, 'utf-8');
  let products = JSON.parse(rawData);
  console.log(`[Data] Tổng số sản phẩm trong JSON: ${products.length.toLocaleString('vi-VN')}`);

  // Áp dụng bộ lọc nếu có
  if (categoryFilter) {
    products = products.filter(
      (p) =>
        (p.category_name && p.category_name.toLowerCase().includes(categoryFilter)) ||
        (p['tên sản phẩm'] && p['tên sản phẩm'].toLowerCase().includes(categoryFilter))
    );
    console.log(`[Filter] Đã lọc theo danh mục '${categoryFilter}': còn ${products.length} sản phẩm`);
  }

  // Lọc chỉ các sản phẩm có url_image hợp lệ
  products = products.filter((p) => p.url_image && p.url_image.startsWith('http'));

  if (limit && limit > 0) {
    products = products.slice(0, limit);
    console.log(`[Limit] Giới hạn xử lý đợt này: ${limit} sản phẩm`);
  }

  console.log(`\nBắt đầu tải và đẩy vào MinIO S3 (Concurrency: 8 luồng)...`);
  const startTime = Date.now();
  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const mappingResults = [];

  const mapper = async (product, idx) => {
    const rawSku = product.productcode || product.product_id;
    // Chuẩn hóa SKU để làm key S3
    const safeSku = String(rawSku).replace(/[^a-zA-Z0-9_-]/g, '');
    const originalUrl = product.url_image;
    const objectKey = `products/${safeSku}.jpg`;

    // 1. Kiểm tra Idempotency: Nếu object đã có trên MinIO thì bỏ qua
    try {
      const stat = await minioClient.statObject(BUCKET_NAME, objectKey);
      if (stat && stat.size > 0) {
        skippedCount++;
        const publicUrl = `http://${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}/${BUCKET_NAME}/${objectKey}`;
        mappingResults.push({
          product_id: product.product_id,
          sku: product.productcode,
          name: product['tên sản phẩm'],
          original_url: originalUrl,
          minio_object_key: objectKey,
          minio_url: publicUrl,
          size_bytes: stat.size,
          status: 'SKIPPED_EXISTING',
        });
        return;
      }
    } catch (e) {
      // statObject ném lỗi nếu không tồn tại -> tiếp tục tải
    }

    // 2. Tải ảnh từ CDN
    try {
      const { buffer, mime, ext } = await downloadImageWithRetry(originalUrl);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      // 3. Đẩy lên MinIO
      await minioClient.putObject(BUCKET_NAME, objectKey, buffer, buffer.length, {
        'Content-Type': mime,
        'X-Amz-Meta-Original-Url': originalUrl,
        'X-Amz-Meta-Sha256': checksumSha256,
        'X-Amz-Meta-Product-Id': String(product.product_id || ''),
      });

      uploadedCount++;
      const publicUrl = `http://${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}/${BUCKET_NAME}/${objectKey}`;

      mappingResults.push({
        product_id: product.product_id,
        sku: product.productcode,
        name: product['tên sản phẩm'],
        original_url: originalUrl,
        minio_object_key: objectKey,
        minio_url: publicUrl,
        size_bytes: buffer.length,
        checksum_sha256: checksumSha256,
        status: 'UPLOADED_SUCCESS',
      });

      if ((uploadedCount + skippedCount) % 10 === 0 || uploadedCount + skippedCount === products.length) {
        console.log(
          `  [Tiến độ ${uploadedCount + skippedCount}/${products.length}] Upload: ${uploadedCount} | Skip: ${skippedCount} | Lỗi: ${failedCount}`
        );
      }
    } catch (err) {
      failedCount++;
      console.warn(`  [Lỗi SKU ${safeSku}] Không thể tải ${originalUrl}: ${err.message}`);
      mappingResults.push({
        product_id: product.product_id,
        sku: product.productcode,
        original_url: originalUrl,
        status: 'FAILED',
        error: err.message,
      });
    }
  };

  await pMap(products, mapper, 8);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(65));
  console.log(`✅ HOÀN TẤT TRONG ${durationSec} GIÂY!`);
  console.log(`   - Tổng sản phẩm xử lý: ${products.length}`);
  console.log(`   - Tải & Upload mới:   ${uploadedCount}`);
  console.log(`   - Bỏ qua do đã có:    ${skippedCount}`);
  console.log(`   - Thất bại:           ${failedCount}`);
  console.log('='.repeat(65));

  // Ghi kết quả ánh xạ ra tệp JSON
  const outputDir = path.dirname(OUTPUT_MAPPING_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(mappingResults, null, 2), 'utf-8');
  console.log(`[Mapping] Đã lưu bảng ánh xạ MinIO URL tại: ${OUTPUT_MAPPING_PATH}`);
  console.log(`[MinIO Console] Xem ảnh tại: http://localhost:9001 (Bucket: '${BUCKET_NAME}')`);
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
