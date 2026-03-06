-- Update PTIT template config
UPDATE excel_templates 
SET 
  file_key = 'templates/PTIT.xlsx', 
  header_rows = 9, 
  data_start_row = 10, 
  date_cell = 'A7', 
  column_mapping = '{"stt":"A","ma_sv":"B","ho_ten":"C","ngay_sinh":"D","noi_sinh":"E","dan_toc":"F","gioi_tinh":"G","ho_so":"H","cccd":"I","sdt":"J","email":"K"}'
WHERE name = 'ptit';
