/**
 * ThiSmart Brand & 3D Assets Master Registry
 * Source: docs/05-frontend/assets/ & docs/05-frontend/THISMART_BRAND_GUIDELINES.md
 */

export const BRAND_LOGOS = {
  // Flat Logos
  horizontalLight: "/brand/logo-horizontal-light.png",
  horizontalTaglineLight: "/brand/logo-horizontal-tagline-light.png",
  horizontalTaglineDark: "/brand/logo-horizontal-tagline-dark.png",
  logoMark: "/brand/logo-mark.png",
  appIcon: "/brand/app-icon.png",

  // 3D Logos & Marks
  logo3dHorizontal: "/brand/logo-3d-horizontal.png",
  logo3dTaglineLight: "/brand/logo-3d-tagline-light.png",
  logo3dTaglineDark: "/brand/logo-3d-tagline-dark.png",
  logoMark3d: "/brand/logo-mark-3d.png",
  appIconSquircle3d: "/brand/app-icon-squircle-3d.png",
} as const;

export interface AssetMeta {
  src: string;
  width: number;
  height: number;
  title: string;
  description: string;
  category: "illustration" | "icon_3d" | "brand" | "decorative";
}

export const BRAND_ILLUSTRATIONS_3D: Record<string, AssetMeta> = {
  heroExamOrbit: {
    src: "/brand/illustrations/hero-exam-orbit-3d.png",
    width: 1672,
    height: 941,
    title: "Quỹ Đạo Bài Thi Thông Minh (Hero)",
    description: "Biểu tượng ThiSmart trung tâm cùng quỹ đạo phát sáng, đề thi trôi nổi và biểu mẫu chấm thi.",
    category: "illustration",
  },
  questionBank: {
    src: "/brand/illustrations/question-bank-3d.png",
    width: 1254,
    height: 1254,
    title: "Ngân Hàng Câu Hỏi & Cây Chủ Đề",
    description: "Cửa sổ soạn câu hỏi với huy hiệu Q, cây thư mục chủ đề và các định dạng trắc nghiệm / tự luận.",
    category: "illustration",
  },
  focusExamRoom: {
    src: "/brand/illustrations/focus-exam-room-3d.png",
    width: 1254,
    height: 1254,
    title: "Phòng Thi Focus Mode & Autosave",
    description: "Màn hình thi tinh gọn, đồng hồ đếm ngược, huy hiệu đám mây lưu tự động và bảng điều hướng câu hỏi.",
    category: "illustration",
  },
  proctoringSecurity: {
    src: "/brand/illustrations/proctoring-security-3d.png",
    width: 1254,
    height: 1254,
    title: "Giám Sát Ca Thi & Khiên Bảo Mật",
    description: "Khiên bảo vệ phát sáng mang biểu tượng ThiSmart, ổ khóa bảo mật và thẻ cảnh báo gian lận.",
    category: "illustration",
  },
  examCreation: {
    src: "/brand/illustrations/exam-creation-3d.png",
    width: 1448,
    height: 1086,
    title: "Thiết Kế Đề Thi & Ma Trận Câu Hỏi",
    description: "Bảng kẹp đề thi 3D với biểu đồ cột, nút kiểm xanh, thiết lập ma trận và xem trước đề.",
    category: "illustration",
  },
  sessionScheduling: {
    src: "/brand/illustrations/session-scheduling-3d.png",
    width: 1448,
    height: 1086,
    title: "Lập Lịch Ca Thi & Phân Công Thí Sinh",
    description: "Quyển lịch tháng dạng xoắn ốc 3D, đồng hồ kim nổi và danh sách ca thi tổ chức chuẩn mực.",
    category: "illustration",
  },
  gradingAnalytics: {
    src: "/brand/illustrations/grading-analytics-3d.png",
    width: 1448,
    height: 1086,
    title: "Chấm Điểm Tức Thì & Báo Cáo Phổ Điểm",
    description: "Thẻ kết quả kính mờ (glassmorphism), biểu đồ cột phổ điểm và tỷ lệ đạt chuẩn học phần.",
    category: "illustration",
  },
  userRoles: {
    src: "/brand/illustrations/user-roles-3d.png",
    width: 1448,
    height: 1086,
    title: "Người Dùng & Ma Trận Phân Quyền RBAC",
    description: "Bộ 3 avatar 3D đại diện cho Quản trị viên, Giảng viên và Thí sinh kèm danh sách quyền hạn.",
    category: "illustration",
  },
};

export const BRAND_ICONS_3D: Record<string, AssetMeta> = {
  heroOrbit: {
    src: "/brand/icons-3d/icon-hero-orbit.png",
    width: 1448,
    height: 1086,
    title: "Icon Quỹ Đạo Bài Thi",
    description: "Biểu tượng tính năng khảo thí trung tâm",
    category: "icon_3d",
  },
  questionBank: {
    src: "/brand/icons-3d/icon-question-bank.png",
    width: 1448,
    height: 1086,
    title: "Icon Ngân Hàng Câu Hỏi",
    description: "Cửa sổ câu hỏi & thư mục kiến thức 3D",
    category: "icon_3d",
  },
  focusRoom: {
    src: "/brand/icons-3d/icon-focus-room.png",
    width: 1448,
    height: 1086,
    title: "Icon Phòng Thi Focus Mode",
    description: "Màn hình thi trực quan & đồng hồ đếm ngược 3D",
    category: "icon_3d",
  },
  securityShield: {
    src: "/brand/icons-3d/icon-security-shield.png",
    width: 1448,
    height: 1086,
    title: "Icon Khiên Giám Sát An Ninh",
    description: "Khiên an toàn công nghệ cao & ổ khóa 3D",
    category: "icon_3d",
  },
  examCreation: {
    src: "/brand/icons-3d/icon-exam-creation.png",
    width: 1448,
    height: 1086,
    title: "Icon Soạn Đề Thi Mẫu",
    description: "Bảng kẹp đề thi & danh sách kiểm duyệt 3D",
    category: "icon_3d",
  },
  scheduling: {
    src: "/brand/icons-3d/icon-scheduling.png",
    width: 1448,
    height: 1086,
    title: "Icon Lập Lịch Ca Thi",
    description: "Quyển lịch xoắn ốc & đồng hồ thời gian 3D",
    category: "icon_3d",
  },
  analytics: {
    src: "/brand/icons-3d/icon-analytics.png",
    width: 1448,
    height: 1086,
    title: "Icon Phổ Điểm & Báo Cáo",
    description: "Biểu đồ cột thống kê & thẻ kết quả 3D",
    category: "icon_3d",
  },
  userRoles: {
    src: "/brand/icons-3d/icon-user-roles.png",
    width: 1448,
    height: 1086,
    title: "Icon Vai Trò Người Dùng",
    description: "Avatar phân quyền đa tầng RBAC 3D",
    category: "icon_3d",
  },
  integrations: {
    src: "/brand/icons-3d/icon-integrations.png",
    width: 353,
    height: 292,
    title: "Icon Tích Hợp API",
    description: "Khối kết nối dữ liệu RESTful API 3D",
    category: "icon_3d",
  },
  graduationCap: {
    src: "/brand/icons-3d/icon-graduation-cap.png",
    width: 256,
    height: 256,
    title: "Mũ Cử Nhân Tốt Nghiệp",
    description: "Huy hiệu hoàn thành bài thi & chứng nhận tốt nghiệp 3D",
    category: "decorative",
  },
  cube: {
    src: "/brand/icons-3d/icon-cube.png",
    width: 256,
    height: 256,
    title: "Khối Lập Phương Isometric",
    description: "Họa tiết trang trí công nghệ 3D",
    category: "decorative",
  },
  paperPlane: {
    src: "/brand/icons-3d/icon-paper-plane.png",
    width: 256,
    height: 256,
    title: "Máy Bay Giấy Vươn Cao",
    description: "Họa tiết chuyển tiếp & nộp bài thần tốc 3D",
    category: "decorative",
  },
  decorativeExam: {
    src: "/brand/icons-3d/icon-decorative-exam.png",
    width: 512,
    height: 512,
    title: "Họa Tiết Đề Thi Nổi",
    description: "Bản vẽ đề thi trôi nổi 3D",
    category: "decorative",
  },
};
