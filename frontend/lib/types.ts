export interface Signal {
  date: string;
  signal_type: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  price: number;
  outcome: "correct" | "incorrect" | "pending";
}

export interface ProbaItem {
  date: string;
  price: number;
  bullish_prob: number;
  bearish_prob: number;
  index: number;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ROCClassData {
  fpr: number[];
  tpr: number[];
  auc: number;
}

export interface SHAPItem {
  feature: string;
  importance: number;
  category: string;
}

export interface ClassificationReport {
  [key: string]: {
    precision: number;
    recall: number;
    "f1-score": number;
    support: number;
  };
}

export interface Metrics {
  test_accuracy: number;
  test_f1: number;
  val_accuracy: number;
  val_f1: number;
  classification_report: ClassificationReport;
  roc_data: {
    class_0?: ROCClassData;
    class_1?: ROCClassData;
    class_2?: ROCClassData;
  };
}

export interface SignalSummary {
  total_signals: number;
  buy_signals: number;
  sell_signals: number;
  correct_signals: number;
  win_rate: number;
  avg_confidence: number;
}

export interface LabelConfig {
  look_ahead: number;
  threshold: number;
}

export interface AnalysisResult {
  ticker: string;
  date_range: { start: string; end: string };
  candles: Candle[];
  signals: Signal[];
  raw_probas: ProbaItem[];
  best_label_config: LabelConfig;
  best_params: Record<string, number>;
  metrics: Metrics;
  shap_importance: SHAPItem[];
  signal_summary: SignalSummary;
  look_ahead: number;
}

export interface SSEEvent {
  stage: number;
  message: string;
  progress: number;
  data?: AnalysisResult;
  error?: string;
}
