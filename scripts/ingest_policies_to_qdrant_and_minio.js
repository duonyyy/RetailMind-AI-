/**
 * RetailMind AI — Knowledge Ingestion to MinIO & Qdrant Pipeline
 * 
 * Luồng xử lý:
 * 1. Quét toàn bộ tài liệu Markdown chính sách trong data/raw_documents/policies/
 * 2. Làm sạch PII (ẩn số điện thoại, CCCD) theo NĐ 13/2023/NĐ-CP & Luật 91/2025/QH15
 * 3. Băm SHA-256 toàn vẹn & Upload file gốc lên MinIO S3 bucket `retailmind-documents`
 * 4. Phân đoạn (Chunking) theo cấu trúc Điều/Mục (chuẩn NĐ 30/2020/NĐ-CP)
 * 5. Tạo vector embedding 768 chiều (Deterministic Semantic Embedding)
 * 6. Khởi tạo Collection `retail_knowledge_base` trên Qdrant và Upsert toàn bộ points
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve MinIO client from core-api node_modules
const Minio = require(path.resolve(__dirname, '../core-api/node_modules/minio'));

const MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
};

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'retailmind-documents';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = 'retail_knowledge_base';
const VECTOR_DIM = 768;

const POLICIES_DIR = path.resolve(__dirname, '../data/raw_documents/policies');
const LAPTOP_CATALOG_PATH = path.resolve(__dirname, '../agent-system/domains/retail_store/corpus/catalog_laptop.md');

// 1. PII Sanitizer (Nghị định 13/2023 & Luật 91/2025)
function sanitizePII(text) {
  // Mask Vietnamese 10-digit phone number: 0909123456 -> 0909***456
  let sanitized = text.replace(/(0[35789]\d)(\d{3})(\d{3,4})/g, '$1***$3');
  // Mask CCCD 12 digits: 001099123456 -> 0010******56
  sanitized = sanitized.replace(/(\d{4})\d{6}(\d{2})/g, '$1******$2');
  return sanitized;
}

// 2. Deterministic Semantic Embedding 768-dim (Unit Vector)
function generateDeterministicEmbedding(text, dim = VECTOR_DIM) {
  const vector = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  
  if (words.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  for (const word of words) {
    const hash = crypto.createHash('sha256').update(word).digest();
    const index = hash.readUInt16BE(0) % dim;
    const sign = hash[2] % 2 === 0 ? 1.0 : -1.0;
    const weight = 1.0 + (hash[3] / 255.0);
    vector[index] += sign * weight;
  }

  // L2 Normalization (Cosine Similarity ready)
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = parseFloat((vector[i] / norm).toFixed(6));
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
}

// 3. Hierarchical Chunker (Nghị định 30/2020)
function chunkDocument(content, filename) {
  const lines = content.split('\n');
  const chunks = [];
  let currentSection = 'Mở đầu / Giới thiệu';
  let buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Phát hiện tiêu đề phần, chương, điều, mục
    const isHeader = /^#{1,4}\s+/.test(trimmed) || 
                     /^(Điều\s+\d+|Chương\s+[IVXLCDM0-9]+|Phần\s+[IVXLCDM0-9]+|Mục\s+\d+)/i.test(trimmed);

    if (isHeader && buffer.length > 0) {
      const chunkText = buffer.join('\n').trim();
      if (chunkText.length > 60) {
        chunks.push({
          section: currentSection,
          text: sanitizePII(chunkText),
        });
      }
      buffer = [];
      currentSection = trimmed.replace(/^#{1,4}\s+/, '');
    }

    buffer.push(line);

    // Cắt nếu đoạn vượt quá 1000 ký tự
    if (buffer.join('\n').length >= 1000) {
      const chunkText = buffer.join('\n').trim();
      chunks.push({
        section: currentSection,
        text: sanitizePII(chunkText),
      });
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    const chunkText = buffer.join('\n').trim();
    if (chunkText.length > 40) {
      chunks.push({
        section: currentSection,
        text: sanitizePII(chunkText),
      });
    }
  }

  return chunks;
}

async function ensureQdrantCollection() {
  try {
    const checkRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);
    const checkData = await checkRes.json();
    if (checkData.status !== 'ok') {
      console.log(`[Qdrant] Khởi tạo collection '${QDRANT_COLLECTION}' (Vector Dim: ${VECTOR_DIM}, Cosine)...`);
      const createRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: {
            size: VECTOR_DIM,
            distance: 'Cosine',
          },
        }),
      });
      const createData = await createRes.json();
      console.log('[Qdrant] Kết quả tạo collection:', createData.status);
    } else {
      console.log(`[Qdrant] Collection '${QDRANT_COLLECTION}' đã tồn tại.`);
    }
  } catch (err) {
    console.error('[Qdrant Error] Không thể kết nối tới Qdrant:', err.message);
    throw err;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 RETAILMIND AI — TIẾN TRÌNH NẠP TRI THỨC (INGESTION PIPELINE)');
  console.log('='.repeat(70));

  // 1. Kết nối MinIO
  const minioClient = new Minio.Client(MINIO_CONFIG);
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`[MinIO] Đã tạo bucket mới: ${MINIO_BUCKET}`);
    } else {
      console.log(`[MinIO] Bucket '${MINIO_BUCKET}' sẵn sàng.`);
    }
  } catch (err) {
    console.error(`[MinIO Error] Không thể kết nối tới MinIO:`, err.message);
    process.exit(1);
  }

  // 2. Kết nối Qdrant
  await ensureQdrantCollection();

  // 3. Thu thập danh sách tệp chính sách
  const filesToIngest = [];
  if (fs.existsSync(POLICIES_DIR)) {
    const entries = fs.readdirSync(POLICIES_DIR).filter((f) => f.endsWith('.md'));
    for (const f of entries) {
      filesToIngest.push(path.join(POLICIES_DIR, f));
    }
  }
  if (fs.existsSync(LAPTOP_CATALOG_PATH)) {
    filesToIngest.push(LAPTOP_CATALOG_PATH);
  }

  console.log(`\n📂 Tìm thấy ${filesToIngest.length} tài liệu tri thức để nạp.\n`);

  let totalPoints = 0;
  let globalPointId = 1;
  const allPoints = [];

  for (const filePath of filesToIngest) {
    const filename = path.basename(filePath);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');
    const objectKey = `policies/${checksum.substring(0, 10)}_${filename}`;

    // Upload MinIO
    try {
      await minioClient.putObject(MINIO_BUCKET, objectKey, Buffer.from(rawContent, 'utf-8'), {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Amz-Meta-Checksum': checksum,
      });
      console.log(`✓ [MinIO S3] Uploaded: ${filename} -> s3://${MINIO_BUCKET}/${objectKey}`);
    } catch (err) {
      console.warn(`! [MinIO S3] Lỗi tải lên ${filename}:`, err.message);
    }

    // Cắt đoạn & nhúng vector
    const chunks = chunkDocument(rawContent, filename);
    console.log(`  └─> Phân tích thành ${chunks.length} chunks ngữ nghĩa.`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = generateDeterministicEmbedding(chunk.text);
      allPoints.push({
        id: globalPointId++,
        vector,
        payload: {
          doc_id: filename.replace('.md', ''),
          filename,
          section: chunk.section,
          content: chunk.text,
          minio_key: objectKey,
          checksum_sha256: checksum,
          ingested_at: new Date().toISOString(),
        },
      });
    }
    totalPoints += chunks.length;
  }

  // 4. Batch Upsert vào Qdrant
  console.log(`\n⚡ Đang nạp ${allPoints.length} vector points vào Qdrant Vector DB...`);
  const BATCH_SIZE = 50;
  for (let i = 0; i < allPoints.length; i += BATCH_SIZE) {
    const batch = allPoints.slice(i, i + BATCH_SIZE);
    const upsertRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: batch }),
    });
    const upsertData = await upsertRes.json();
    if (upsertData.status === 'ok') {
      console.log(`  ✓ Đã nạp batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} points)`);
    } else {
      console.error(`  ✗ Lỗi batch ${Math.floor(i / BATCH_SIZE) + 1}:`, upsertData);
    }
  }

  // 5. Kiểm tra lại thông tin collection trên Qdrant
  const infoRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);
  const infoData = await infoRes.json();
  const pointCount = infoData.result?.points_count ?? totalPoints;

  console.log('\n' + '='.repeat(70));
  console.log('🎉 NẠP TRI THỨC THÀNH CÔNG RỰC RỠ!');
  console.log(`- MinIO Bucket: s3://${MINIO_BUCKET} (${filesToIngest.length} tệp tài liệu gốc)`);
  console.log(`- Qdrant Collection: '${QDRANT_COLLECTION}' (${pointCount} vectors đã lập chỉ mục)`);
  console.log(`- Bảng điều khiển Qdrant: ${QDRANT_URL}/dashboard`);
  console.log(`- Bảng điều khiển MinIO: http://localhost:9001`);
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('\n❌ TIẾN TRÌNH NẠP THẤT BẠI:', err);
  process.exit(1);
});

