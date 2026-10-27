"""Statistical Z-Score Anomaly & Drift Detector for LLMOps & Lakehouse Ingestion.

Complies with Section 13.3 of Enterprise Data Infra & LLMOps Architecture (Day 27):
Detects sudden Token Bombing attacks, Latency Drifts, and Ingestion Outliers via rolling 3-Sigma checks:
    Z = (x - mu) / sigma

Alerts when Z > 3.0 (99.7% confidence interval) before runaway queries burn through FinOps budgets.
"""

from __future__ import annotations

import math
from enum import StrEnum
from collections import deque
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class AnomalySeverity(StrEnum):
    NORMAL = "normal"
    WARNING = "warning"
    ANOMALOUS = "anomalous"


class AnomalyReport(BaseModel):
    """Statistical audit report for an observed metric value."""
    metric_name: str
    observed_value: float
    mean: float
    std_dev: float
    z_score: float
    severity: AnomalySeverity
    is_anomaly: bool
    sample_count: int
    message: str


class ZScoreAnomalyDetector:
    """Rolling window statistical watchdog computing Z-scores for real-time drift detection."""

    def __init__(
        self,
        window_size: int = 30,
        z_threshold: float = 3.0,
        warning_threshold: float = 2.0,
        min_samples: int = 5
    ):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.warning_threshold = warning_threshold
        self.min_samples = min_samples
        # metric_name -> deque of values
        self._history: Dict[str, deque[float]] = {}

    def _get_history(self, metric_name: str) -> deque[float]:
        if metric_name not in self._history:
            self._history[metric_name] = deque(maxlen=self.window_size)
        return self._history[metric_name]

    def record_and_evaluate(self, metric_name: str, value: float) -> AnomalyReport:
        """Record observed sample and evaluate whether it constitutes a statistical anomaly."""
        history = self._get_history(metric_name)
        count = len(history)

        if count < self.min_samples:
            history.append(value)
            return AnomalyReport(
                metric_name=metric_name,
                observed_value=value,
                mean=value,
                std_dev=0.0,
                z_score=0.0,
                severity=AnomalySeverity.NORMAL,
                is_anomaly=False,
                sample_count=len(history),
                message=f"Giai đoạn khởi động (Warmup): {len(history)}/{self.min_samples} mẫu cần thiết."
            )

        mean = sum(history) / count
        variance = sum((x - mean) ** 2 for x in history) / count
        std_dev = math.sqrt(variance)

        # Avoid zero division when all historical samples are identical
        if std_dev == 0.0:
            std_dev = 1e-6

        z_score = (value - mean) / std_dev
        abs_z = abs(z_score)

        if abs_z >= self.z_threshold:
            severity = AnomalySeverity.ANOMALOUS
            is_anomaly = True
            msg = (
                f"CẢNH BÁO BẤT THƯỜNG THỐNG KÊ: Giá trị '{metric_name}' ({value:.2f}) "
                f"vượt ngưỡng 3-Sigma (|Z| = {abs_z:.2f} >= {self.z_threshold:.1f}). "
                f"Phát hiện nguy cơ Token Bombing hoặc trôi dạt độ trễ."
            )
        elif abs_z >= self.warning_threshold:
            severity = AnomalySeverity.WARNING
            is_anomaly = False
            msg = f"Cảnh báo tiệm cận bất thường: |Z| = {abs_z:.2f} >= {self.warning_threshold:.1f}."
        else:
            severity = AnomalySeverity.NORMAL
            is_anomaly = False
            msg = f"Giá trị phân phối chuẩn bình thường (|Z| = {abs_z:.2f} < {self.warning_threshold:.1f})."

        # Append to rolling history
        history.append(value)

        return AnomalyReport(
            metric_name=metric_name,
            observed_value=round(value, 3),
            mean=round(mean, 3),
            std_dev=round(std_dev, 3),
            z_score=round(z_score, 3),
            severity=severity,
            is_anomaly=is_anomaly,
            sample_count=len(history),
            message=msg
        )

    def get_stats(self, metric_name: str) -> Dict[str, Any]:
        """Return summary statistics for a tracked metric."""
        history = self._get_history(metric_name)
        if not history:
            return {"sample_count": 0}

        count = len(history)
        mean = sum(history) / count
        variance = sum((x - mean) ** 2 for x in history) / count
        return {
            "metric_name": metric_name,
            "sample_count": count,
            "mean": round(mean, 3),
            "std_dev": round(math.sqrt(variance), 3),
            "min": round(min(history), 3),
            "max": round(max(history), 3)
        }
