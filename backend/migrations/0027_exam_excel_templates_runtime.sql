-- Normalize runtime Excel templates for exam exports

INSERT OR IGNORE INTO excel_templates (
  name,
  display_name,
  file_key,
  header_rows,
  data_start_row,
  date_cell,
  column_mapping
)
VALUES
  (
    'ptit',
    'Học viện PTIT',
    'templates/MAUPTIT.xlsx',
    8,
    9,
    'F4',
    '{"stt":"A","so_phach":"B","cccd":"C","ho_ten_dem":"D","ten":"E","ngay_sinh":"F","noi_sinh":"G","gioi_tinh":"H","dan_toc":"I"}'
  ),
  (
    'vept',
    'VEPT',
    'templates/MAUVEPT.xlsx',
    4,
    5,
    '',
    '{"stt":"A","ho_ten_dem":"B","ten":"C","gioi_tinh":"D","ngay":"E","thang":"F","nam":"G","cccd":"H","sdt":"I","email":"J","don_vi":"K","exam_level":"M","exam_date":"N","location":"T"}'
  );

UPDATE excel_templates
SET
  display_name = 'Học viện PTIT',
  file_key = 'templates/MAUPTIT.xlsx',
  header_rows = 8,
  data_start_row = 9,
  date_cell = 'F4',
  column_mapping = '{"stt":"A","so_phach":"B","cccd":"C","ho_ten_dem":"D","ten":"E","ngay_sinh":"F","noi_sinh":"G","gioi_tinh":"H","dan_toc":"I"}'
WHERE lower(name) = 'ptit';

UPDATE excel_templates
SET
  display_name = 'VEPT',
  file_key = 'templates/MAUVEPT.xlsx',
  header_rows = 4,
  data_start_row = 5,
  date_cell = '',
  column_mapping = '{"stt":"A","ho_ten_dem":"B","ten":"C","gioi_tinh":"D","ngay":"E","thang":"F","nam":"G","cccd":"H","sdt":"I","email":"J","don_vi":"K","exam_level":"M","exam_date":"N","location":"T"}'
WHERE lower(name) = 'vept';
