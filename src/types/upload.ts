export interface NamedValue {
  name: string;
  value: string;
}

export interface ExcelParseResult {
  table_rows: NamedValue[][];
}

export interface ExcelParserProps {
  onParse?: (result: ExcelParseResult) => void;
  onError?: (error: Error) => void;
}
