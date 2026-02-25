// Tồn kho tối thiểu theo size cho trường hợp bán chậm
  SIZE_MIN_STOCKS_SLOW: {
    '40': 3, '41': 5, '42': 5, '43': 5, '44': 3, '45': 2
  } as Record<string, number>,
   

logic hiện tại theo kiểu  chia bài : chia co 40 này lên 3 , cho 41 lên 5 ,.... khi này là 23

# Ngữ cảnh : hiện tại muốn nhập size nam bán chậm là nhập 23 theo tồn kho định mức hiện tại 
# Mong muốn là chỉ nhập 12 thôi và các size chia đều cho nhau, dựa theo tồn kho định mức hiện tại 
# Mục tiêu ít lẻ size 
# Chỉ size nam ( trong list chỉ có nam )
# Chỉ lấy 12 trong 23 lá . 
logic mong muốn : chia bài cho 42 - 41 - 43 - 40 - 44  - 45 
12 lá bài  

ví dụ 1:
42 - 41 - 43 - 40 - 44 - 45
5    5    5    3    3     2  => tồn kho định mức
0    4    3    3    1     0  => tồn kho hiện tại
1    4    3    3    1     1  => tốn 2 lá còn 10 lá 
2    4    3    3    2     2  => tốn thêm 3 còn 7 lá 
3    4    3    3    3     2  => tốn thêm 2 lá còn 5 lá 
4    4    4    3    3     2  => tốn thêm 2 lá còn 3 lá
5    5    5    3    3     2  => tốn thêm 3 còn 0 

ví dụ 2:
42 - 41 - 43 - 40 - 44 - 45
5    5    5    3    3     2  => tồn kho định mức
0    0    0    0    0     0  => tồn kho hiện tại
1    1    1    1    1     1  => tốn 6 còn 6
2    2    2    2    2     2  => tốn 6 còn 0 

