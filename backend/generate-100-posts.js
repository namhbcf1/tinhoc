const fs = require('fs');

// TOPICS CONFIGURATION
const topics = [
    { cat: 'Tiếng Anh', tags: 'IELTS,Tiếng Anh,Du học,Học bổng,Kỹ năng' },
    { cat: 'Tiếng Anh', tags: 'TOEIC,Ngữ pháp,Từ vựng,Đi làm,Business' },
    { cat: 'Tiếng Trung', tags: 'HSK,Tiếng Trung,Du học Trung Quốc,Văn hóa,Job' },
    { cat: 'Tiếng Nhật', tags: 'JLPT,Tiếng Nhật,Du học Nhật Bản,Kaizen,Văn hóa' },
    { cat: 'Tiếng Hàn', tags: 'TOPIK,Tiếng Hàn,Văn hóa Hàn,K-Drama,Du học' },
    { cat: 'Kỹ năng mềm', tags: 'Thuyết trình,Phỏng vấn,CV,Lãnh đạo,Thời gian' },
    { cat: 'Tin học', tags: 'MOS,Excel,Word,Thủ thuật,Văn phòng' },
    { cat: 'Du học', tags: 'Học bổng,Visa,Kinh nghiệm,Săn học bổng,Cuộc sống' }
];

// IMAGES CONFIGURATION (Pexels Verified - Static & Stable)
const verifiedImages = {
    'Tiếng Anh': [
        'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/159844/cellular-education-classroom-159844.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Tiếng Trung': [
        'https://images.pexels.com/photos/1900203/pexels-photo-1900203.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3422964/pexels-photo-3422964.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/234257/pexels-photo-234257.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Tiếng Nhật': [
        'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=800', // Tokyo
        'https://images.pexels.com/photos/1134166/pexels-photo-1134166.jpeg?auto=compress&cs=tinysrgb&w=800', // Cherry blossom
        'https://images.pexels.com/photos/2187605/pexels-photo-2187605.jpeg?auto=compress&cs=tinysrgb&w=800'  // Japan street
    ],
    'Tiếng Hàn': [
        'https://images.pexels.com/photos/2376713/pexels-photo-2376713.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1820466/pexels-photo-1820466.jpeg?auto=compress&cs=tinysrgb&w=800', // Night city
        'https://images.pexels.com/photos/2388639/pexels-photo-2388639.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'Default': [
        'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3807755/pexels-photo-3807755.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
};

// ==========================================
// V4 PROFESSIONAL CONTENT TEMPLATES (MASSIVE TEXT)
// ==========================================
const multiContents = {
    'Tiếng Anh': [
        {
            title: "Lộ trình tự học IELTS 7.5+ từ con số 0: Hướng dẫn chi tiết từng ngày (Cập nhật 2026)",
            content: `
<h2>Phần 1: Tư duy đúng đắn trước khi bắt đầu (Mindset)</h2>
<p>Rất nhiều bạn lao vào ôn thi IELTS với tâm thế "học mẹo", "học tủ". Đây là sai lầm chết người khiến bạn mãi dậm chân tại chỗ ở band 5.0 - 5.5. IELTS là bài kiểm tra năng lực ngôn ngữ thực sự. Nếu nền tảng bạn yếu, móng nhà lung lay, bạn không thể xây lầu cao được.</p>
<p>Hãy xác định tư duy: <strong>Học tiếng Anh để sử dụng, không phải chỉ để đi thi.</strong> Khi tiếng Anh của bạn tốt lên, điểm IELTS sẽ tự động tăng.</p>

<h2>Phần 2: Xây dựng nền tảng (Foundation) - 0 đến 3 tháng</h2>
<p>Giai đoạn này cực kỳ nhàm chán nhưng quan trọng nhất. Đừng vội đụng vào đề Cambridge.</p>

<h3>1. Phát âm (Pronunciation)</h3>
<p>Tại sao bạn nghe không được? Tại sao giám khảo không hiểu bạn nói gì? 90% là do phát âm sai.</p>
<ul>
    <li><strong>Bảng IPA:</strong> Hãy học thuộc lòng cách phát âm 44 âm trong bảng IPA. Đừng đoán cách đọc qua mặt chữ.</li>
    <li><strong>Trọng âm (Stress) & Ngữ điệu (Intonation):</strong> Tiếng Anh là ngôn ngữ có trọng âm. "Record" (danh từ) trọng âm 1, nhưng "Record" (động từ) trọng âm 2. Sai trọng âm = Sai nghĩa.</li>
    <li><strong>Nguồn học:</strong> Kênh Youtube <em>Rachel's English</em> hoăc <em>Elsa Speak</em>.</li>
</ul>

<h3>2. Từ vựng (Vocabulary)</h3>
<p>Đừng học từ đơn lẻ. Hãy học theo cụm (Collocations). Ví dụ: Đừng chỉ học "Decision". Hãy học "Make a decision".</p>
<p>Bộ sách gối đầu giường: <em>Cambridge Vocabulary for IELTS</em>. Hãy chuẩn bị một cuốn sổ tay, phương pháp Flashcard (Anki/Quizlet) để ôn tập lặp lại ngắt quãng.</p>

<h3>3. Ngữ pháp (Grammar)</h3>
<p>IELTS không yêu cầu bạn biết tất cả ngữ pháp trên đời. Bạn chỉ cần nắm chắc:</p>
<ul>
    <li>Các thì cơ bản: Quá khứ đơn, Hiện tại hoàn thành, Tương lai đơn.</li>
    <li>Câu phức (Complex Sentences): Mệnh đề quan hệ, Câu điều kiện, Mệnh đề nhượng bộ (Although/Despite).</li>
    <li>Câu bị động (Passive Voice): Dùng rất nhiều trong Writing Task 1 (Process).</li>
</ul>

<h2>Phần 3: Luyện từng kỹ năng (Skill Building) - 3 đến 6 tháng</h2>

<h3>Listening - Nghe tắm ngôn ngữ</h3>
<p>Phương pháp <strong>Nghe chép chính tả (Dictation)</strong> là vua của mọi phương pháp. Nghe một đoạn 3-5 phút, chép lại y nguyên những gì bạn nghe được. So sánh với transcript. Bạn sẽ nhận ra mình bỏ sót rất nhiều từ nhỏ (linking words, articles).</p>
<p>Nguồn nghe: <em>TED Talks, BBC Learning English, Podcast IELTS Energy.</em></p>

<h3>Reading - Đọc sâu hiểu kỹ</h3>
<p>Đừng chỉ làm test rồi check đáp án. Hãy làm <strong>Deep Reading</strong>:</p>
<ol>
    <li>Làm bài trong 60 phút.</li>
    <li>Check đáp án, tính điểm.</li>
    <li>Dịch toàn bộ bài đọc sang tiếng Việt. Học hết từ mới trong bài.</li>
    <li>Phân tích tại sao câu đó đáp án là A mà không phải B? Bẫy nằm ở đâu?</li>
</ol>

<h3>Writing - Tư duy logic</h3>
<p>Writing không phải là nơi để khoe từ vựng khủng. Giám khảo cần sự mạch lạc (Coherence) và tính liên kết (Cohesion).</p>
<ul>
    <li>Cấu trúc đoạn văn P.E.E (Point - Explain - Example).</li>
    <li>Luôn lập dàn ý trước khi viết. Đừng viết tới đâu nghĩ tới đó.</li>
</ul>

<h3>Speaking - Phản xạ tự nhiên</h3>
<p>Đừng học thuộc câu trả lời mẫu (Sample Answers). Giám khảo được đào tạo để phát hiện thí sinh học thuộc lòng. Hãy luyện tập Paraphrasing (diễn đạt lại ý) và giải thích ý tưởng của mình theo cách đơn giản nhất.</p>

<h2>Phần 4: Luyện đề (Intensive Practice) - 2 tháng cuối</h2>
<p>Chỉ sử dụng bộ <em>Cambridge IELTS 10-19</em>. Đây là đề thi sát thực tế nhất. Đề trôi nổi trên mạng thường không được kiểm chứng độ khó.</p>
<p>Hãy thi thử ít nhất 2 lần trước khi thi thật để quen với áp lực phòng thi, điều hòa máy lạnh và quản lý thời gian.</p>

<h2>Kết luận</h2>
<p>IELTS 7.5+ không dành cho người lười biếng. Nhưng nó hoàn toàn khả thi nếu bạn có kỷ luật. Hãy bắt đầu ngay hôm nay, từ những việc nhỏ nhất.</p>
`
        },
        {
            title: "Tiếng Anh công sở (Business English): Chìa khóa thăng tiến cho nhân sự Việt",
            content: `
<h2>Sự khác biệt giữa tiếng Anh giao tiếp và tiếng Anh công sở</h2>
<p>Nhiều bạn có IELTS 7.0 nhưng vẫn gặp khó khăn khi đi làm. Tại sao? Vì tiếng Anh học thuật (Academic) khác xa với tiếng Anh thương mại (Business).</p>
<ul>
    <li><strong>Giao tiếp thường:</strong> "I want to talk to you."</li>
    <li><strong>Công sở:</strong> "Could I have a moment to discuss with you?" (Lịch sự, trang trọng hơn).</li>
</ul>

<h2>Kỹ năng viết Email chuyên nghiệp</h2>
<p>Email là bộ mặt của bạn trong công việc. Một email thiếu chủ ngữ, sai ngữ pháp sẽ khiến đối tác đánh giá thấp sự chuyên nghiệp của công ty.</p>
<h3>Cấu trúc email chuẩn:</h3>
<ol>
    <li><strong>Salutation:</strong> Dear Mr./Ms. [Last Name],</li>
    <li><strong>Opening:</strong> "I am writing to enquire about..." / "Hope this email finds you well."</li>
    <li><strong>Body:</strong> Đi thẳng vào vấn đề. Dùng câu ngắn gọn, súc tích. KISS (Keep It Short and Simple).</li>
    <li><strong>Call to Action:</strong> Bạn muốn họ làm gì? "Please let me know by Friday."</li>
    <li><strong>Closing:</strong> "Sincerely," / "Best regards,"</li>
</ol>

<h2>Thuyết trình & Họp hành (Meeting & Presentation)</h2>
<p>Trong các cuộc họp với sếp Tây hay đối tác nước ngoài, bạn cần biết cách:</p>
<ul>
    <li><strong>Ngắt lời lịch sự:</strong> "Sorry to interrupt, but I'd like to add a point here..."</li>
    <li><strong>Đưa ra ý kiến:</strong> "From my perspective..." / "I strongly believe that..."</li>
    <li><strong>Tán thành/Phản đối:</strong> "I couldn't agree more." / "I see your point, but..."</li>
</ul>

<h2>Từ vựng chuyên ngành (Lingo)</h2>
<p>Mỗi ngành (IT, Marketing, Logistics) đều có bộ từ vựng riêng. Ví dụ Marketing có: KPI, ROI, B2B, B2C, Brand Awareness. Hãy học từ vựng theo đúng chuyên ngành của bạn để không bị "ngáo" khi vào việc.</p>

<h2>Lời khuyên cho người đi làm bận rộn</h2>
<p>Bạn không có 2 tiếng mỗi ngày để học. Hãy tận dụng thời gian chết (Dead time):</p>
<ul>
    <li>Nghe Podcast về Business trong lúc lái xe đi làm.</li>
    <li>Chuyển ngôn ngữ điện thoại/máy tính sang tiếng Anh.</li>
    <li>Đọc báo chuyên ngành (TechCrunch, Bloomberg, Harvard Business Review) thay vì lướt Facebook.</li>
</ul>
`
        }
    ],
    'Tiếng Trung': [
        {
            title: "Cẩm nang du học Trung Quốc 2026: Săn học bổng CSC và CIS chưa bao giờ dễ thế",
            content: `
<h2>Sức hút của du học Trung Quốc</h2>
<p>Trung Quốc đang trỗi dậy mạnh mẽ. Nền giáo dục của họ, đặc biệt là các ngành Kỹ thuật, AI, Thương mại điện tử, đang dẫn đầu thế giới. Cộng thêm vị trí địa lý gần Việt Nam, chi phí sinh hoạt rẻ, văn hóa tương đồng, du học Trung Quốc đang là "trend".</p>

<h2>Phân loại các loại học bổng phổ biến</h2>
<h3>1. Học bổng Chính phủ Trung Quốc (CSC)</h3>
<p>Đây là học bổng danh giá nhất (Type A và Type B).
<ul>
    <li><strong>Quyền lợi:</strong> Miễn 100% học phí, miễn KTX, trợ cấp sinh hoạt cao (3000-3500 tệ/tháng).</li>
    <li><strong>Độ cạnh tranh:</strong> Cực cao. Yêu cầu GPA giỏi, HSK 5-6, kế hoạch học tập xuất sắc.</li>
</ul></p>

<h3>2. Học bổng Giáo viên Tiếng Trung Quốc tế (CIS)</h3>
<p>Dành riêng cho các bạn muốn theo ngành Hán ngữ, Giáo dục Hán ngữ.</p>
<ul>
    <li><strong>Quyền lợi:</strong> Giống CSC nhưng trợ cấp thấp hơn chút.</li>
    <li><strong>Yêu cầu:</strong> Bắt buộc có HSK và HSKK điểm cao.</li>
</ul>

<h3>3. Học bổng Trường/Tỉnh</h3>
<p>Dễ săn hơn. Phù hợp với các bạn hồ sơ tầm trung. Thường miễn học phí và KTX, trợ cấp ít hơn.</p>

<h2>Quy trình chuẩn bị hồ sơ (Apply)</h2>
<p>Đừng đợi nước đến chân mới nhảy. Hãy chuẩn bị trước ít nhất 6 tháng.</p>
<ol>
    <li><strong>Thi chứng chỉ HSK/IELTS:</strong> Càng sớm càng tốt.</li>
    <li><strong>Khám sức khỏe:</strong> Theo mẫu form du học Trung Quốc.</li>
    <li><strong>Xin thư giới thiệu:</strong> Từ 2 Phó Giáo sư hoặc Giáo sư (với hệ Thạc sĩ/Tiến sĩ).</li>
    <li><strong>Viết Kế hoạch học tập (Study Plan):</strong> Đây là linh hồn của bộ hồ sơ. Đừng copy mẫu trên mạng. Hãy viết bằng sự chân thành, thể hiện rõ mục tiêu và lý do bạn chọn trường đó.</li>
</ol>

<h2>Cuộc sống du học sinh tại Trung Quốc</h2>
<ul>
    <li><strong>Thanh toán không tiền mặt:</strong> Alipay và WeChat Pay là bắt buộc. Ra đường không cần ví, chỉ cần điện thoại.</li>
    <li><strong>Mua sắm online:</strong> Taobao, JD, Pinduoduo là thiên đường. Tốc độ ship hàng siêu nhanh.</li>
    <li><strong>Ẩm thực:</strong> Đồ ăn Trung Quốc nhiều dầu mỡ và cay. Hãy chuẩn bị mì gói Việt Nam hoặc gia vị trong thời gian đầu chưa quen.</li>
</ul>
`
        }
    ],
    'Tiếng Nhật': [
        {
            title: "Phương pháp Kaizen: Ứng dụng triết lý Nhật Bản để thay đổi cuộc đời",
            content: `
<h2>Kaizen là gì?</h2>
<p>Trong tiếng Nhật, "Kai" (Cải) có nghĩa là thay đổi, "Zen" (Thiện) có nghĩa là tốt hơn. <strong>Kaizen</strong> là sự cải tiến liên tục, không ngừng nghỉ. Đây là bí quyết giúp Toyota và các doanh nghiệp Nhật vươn lên từ tro tàn sau Thế chiến thứ hai.</p>

<h2>Nguyên tắc cốt lõi: 1% mỗi ngày</h2>
<p>Đừng cố gắng thay đổi 100% ngay lập tức. Bạn sẽ bị sốc và bỏ cuộc. Hãy cố gắng tốt hơn ngày hôm qua chỉ 1%.</p>
<p><em>Công thức: 1.01^365 = 37.8.</em> Sau một năm, bạn sẽ tiến bộ gấp 37 lần. Ngược lại, nếu mỗi ngày bạn thụt lùi 1% (0.99^365 = 0.03), bạn sẽ mất tất cả.</p>

<h2>Ứng dụng Kaizen trong học tập</h2>
<ul>
    <li>Đừng cố học 50 từ vựng một ngày rồi hôm sau quên sạch. Hãy học 5 từ mỗi ngày, nhưng duy trì đều đặn 365 ngày.</li>
    <li>Đừng cố ngồi vào bàn học 3 tiếng. Hãy bắt đầu với 5 phút. Khi đã vượt qua sức ỳ, bạn sẽ tự động học tiếp.</li>
</ul>

<h2>Ứng dụng Kaizen trong công việc</h2>
<ul>
    <li>Loại bỏ lãng phí (Muda): Sắp xếp lại bàn làm việc, tối ưu hóa quy trình file trên máy tính.</li>
    <li>Phản hồi liên tục: Luôn tự hỏi "Có cách nào làm việc này nhanh hơn, tốt hơn không?".</li>
</ul>

<h2>Kết luận</h2>
<p>Kaizen không phải là đích đến, nó là một hành trình. Hãy kiên nhẫn với bản thân. Mưa dầm thấm lâu, nỗ lực nhỏ sẽ tạo thành quả lớn.</p>
`
        },
        {
            title: "Review chi tiết các ứng dụng học tiếng Nhật tốt nhất 2026 (Có ưu/nhược điểm)",
            content: `
<h2>Thời đại công nghệ 4.0, học tiếng Nhật không còn khó khăn như trước nhờ sự hỗ trợ của các App thông minh. Dưới đây là top các ứng dụng "must-have" trên điện thoại của mọi dân học tiếng Nhật.</h2>

<h3>1. Mazii Dict - Từ điển quốc dân</h3>
<p>Nếu điện thoại bạn chỉ được cài 1 app tiếng Nhật, hãy cài Mazii. Nó là siêu ứng dụng.</p>
<ul>
    <li><strong>Ưu điểm:</strong> Kho từ vựng khổng lồ, tra cứu đa chiều (Kanji, ngữ pháp, mẫu câu). Cộng đồng người dùng cực lớn, giải thích các từ lóng, từ chuyên ngành mà sách giáo khoa không có. Tính năng đọc báo giúp luyện dịch.</li>
    <li><strong>Nhược điểm:</strong> Bản miễn phí có khá nhiều quảng cáo.</li>
</ul>

<h3>2. Anki - Vua của trí nhớ</h3>
<p>Anki sử dụng thuật toán Lặp lại ngắt quãng (Spaced Repetition System - SRS). Nó sẽ tính toán thời điểm não bộ bạn sắp quên từ vựng để nhắc lại.</p>
<ul>
    <li><strong>Ưu điểm:</strong> Khả năng tùy biến cực cao. Bạn có thể tự tạo bộ flashcard (Deck) của riêng mình, chèn ảnh, âm thanh, video. Đồng bộ hóa giữa máy tính và điện thoại.</li>
    <li><strong>Nhược điểm:</strong> Giao diện hơi khó dùng với người mới (Low-tech). Cần thời gian tìm hiểu cách setup.</li>
</ul>

<h3>3. Duolingo - Học mà chơi</h3>
<p>Phù hợp cho người mới bắt đầu (Beginner) hoặc muốn duy trì thói quen.</p>
<ul>
    <li><strong>Ưu điểm:</strong> Giao diện game hóa (Gamification) cực kỳ cuốn hút. Nhắc nhở học tập dí dỏm (con cú xanh). Miễn phí hoàn toàn.</li>
    <li><strong>Nhược điểm:</strong> Kiến thức khá rời rạc, không hệ thống. Không phù hợp để luyện thi JLPT chuyên sâu.</li>
</ul>

<h3>4. Bucha học tiếng Nhật</h3>
<p>Game học tiếng Nhật made in Vietnam.</p>
<ul>
    <li><strong>Ưu điểm:</strong> Vừa chơi game chạy nhảy vừa học từ vựng, mẫu câu. Rất giải trí. Nội dung bám sát giáo trình Minna no Nihongo.</li>
    <li><strong>Nhược điểm:</strong> Đồ họa 2D đơn giản.</li>
</ul>

<h3>Lời khuyên</h3>
<p>Công cụ chỉ là công cụ. Quan trọng nhất vẫn là sự kiên trì của bạn. Đừng cài quá nhiều app rồi để đó. Hãy chọn ra 1-2 app phù hợp nhất và "cày" nát nó.</p>
`
        }
    ],
    'Default': [
        {
            title: "Kỹ năng Quản lý thời gian (Time Management): Làm chủ 24h hiệu quả",
            content: `
<h2>Tại sao chúng ta luôn cảm thấy "thiếu thời gian"?</h2>
<p>Ai cũng có 24h mỗi ngày. Tại sao có người làm được trăm công nghìn việc, có người lại quay cuồng nhưng không hiệu quả? Vấn đề nằm ở sự <strong>Ưu tiên (Prioritization)</strong>.</p>

<h2>Ma trận Eisenhower - Phân loại công việc</h2>
<p>Hãy chia các đầu việc của bạn vào 4 ô:</p>
<ul>
    <li><strong>Ô 1: Quan trọng & Khẩn cấp (Làm ngay):</strong> Deadline sếp giao, khủng hoảng truyền thông, bài thi ngày mai.</li>
    <li><strong>Ô 2: Quan trọng & Không khẩn cấp (Lên kế hoạch):</strong> Tập thể dục, học ngoại ngữ, xây dựng mối quan hệ. <em>-> Đây là ô của người thành công. Hãy dành 60% thời gian vào đây.</em></li>
    <li><strong>Ô 3: Không quan trọng & Khẩn cấp (Ủy quyền):</strong> Tin nhắn, cuộc gọi không quan trọng, email rác.</li>
    <li><strong>Ô 4: Không quan trọng & Không khẩn cấp (Xóa bỏ):</strong> Lướt TikTok vô thức, xem drama.</li>
</ul>

<h2>Định luật Parkinson</h2>
<p>"Công việc sẽ tự mở rộng ra để chiếm hết thời gian được ấn định cho nó".</p>
<p>Ví dụ: Bạn có 1 tuần để viết báo cáo, bạn sẽ mất 1 tuần. Nếu sếp chỉ cho 2 tiếng, bạn vẫn sẽ hoàn thành nó trong 2 tiếng (với mức độ chấp nhận được). <br> -> <strong>Giải pháp:</strong> Hãy tự đặt deadline giả (Fake Deadline) ngắn hơn thực tế.</p>

<h2>Kỹ thuật Pomodoro</h2>
<p>Não bộ không thể tập trung quá lâu. Hãy làm việc 25 phút - nghỉ 5 phút. Trong 25 phút đó, tắt wifi, tắt thông báo điện thoại. Đó gọi là <strong>Deep Work</strong>.</p>
`
        },
        {
            title: "Trí tuệ cảm xúc (EQ): Yếu tố quyết định sự thăng tiến",
            content: `
<h2>IQ giúp bạn được tuyển dụng, nhưng EQ giúp bạn được thăng chức</h2>
<p>Trong môi trường làm việc hiện đại, khả năng làm việc với con người (People Skills) quan trọng hơn kỹ năng chuyên môn thuần túy.</p>

<h2>5 thành tố của EQ (Theo Daniel Goleman)</h2>
<ol>
    <li><strong>Tự nhận thức (Self-awareness):</strong> Hiểu rõ cảm xúc của mình. Bạn đang giận? Đang buồn? Tại sao? Điểm mạnh/yếu của bạn là gì?</li>
    <li><strong>Tự điều chỉnh (Self-regulation):</strong> Kiểm soát cơn giận. Không để cảm xúc tiêu cực ảnh hưởng đến hành vi. "Uốn lưỡi 7 lần trước khi nói".</li>
    <li><strong>Động lực (Motivation):</strong> Làm việc vì đam mê và mục tiêu dài hạn, không chỉ vì tiền lương.</li>
    <li><strong>Đồng cảm (Empathy):</strong> Đặt mình vào vị trí người khác. Hiểu được nỗi đau và khó khăn của đồng nghiệp/nhân viên.</li>
    <li><strong>Kỹ năng xã hội (Social Skills):</strong> Khả năng giao tiếp, thuyết phục, giải quyết xung đột, làm việc nhóm.</li>
</ol>

<h2>Làm thế nào để rèn luyện EQ?</h2>
<ul>
    <li><strong>Lắng nghe chủ động (Active Listening):</strong> Nghe để hiểu, không phải nghe để đối đáp. Đừng ngắt lời.</li>
    <li><strong>Quan sát ngôn ngữ cơ thể:</strong> Đôi khi lời nói không thật, nhưng ánh mắt và cử chỉ không biết nói dối.</li>
    <li><strong>Học cách khen ngợi:</strong> Khen ngợi chân thành và cụ thể là cách nhanh nhất để xây dựng thiện cảm.</li>
</ul>
`
        }
    ]
};

function slugify(text) {
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// SCRIPT EXECUTION
console.log('Generating Professional V4 Content...');

let sql = 'DELETE FROM posts;\nDELETE FROM sqlite_sequence WHERE name=\'posts\';\n';

const batchSize = 10;
let batchRows = [];
const totalPosts = 100;
const sitemapUrls = []; // Store URLs for sitemap generation


for (let i = 0; i < totalPosts; i++) {
    const topic = topics[getRandomInt(0, topics.length - 1)];
    const categoryTemplates = multiContents[topic.cat] || multiContents['Default'];
    const template = categoryTemplates[i % categoryTemplates.length];

    // Ensure title uniqueness for duplicated templates
    let realTitle = template.title;
    if (i >= 50) {
        realTitle += ` (Phần ${Math.floor(i / 10)})`;
    }
    const slug = slugify(realTitle) + '-' + i; // Unique slug

    let realContent = template.content;

    // Add professional intro
    const intros = [
        `<p class="lead" style="font-size: 1.1em; color: #555;"><em>Chào mừng độc giả đến với chuyên mục chia sẻ kiến thức chuyên sâu của VanTrangEdu. Bài viết hôm nay sẽ đi sâu phân tích vấn đề dưới góc nhìn chuyên gia.</em></p>`,
        `<p class="lead" style="font-size: 1.1em; color: #555;"><em>Kiến thức là sức mạnh. Trong bài viết này, chúng tôi đã tổng hợp những kinh nghiệm thực chiến nhất, được kiểm chứng bởi đội ngũ giảng viên hàng đầu.</em></p>`
    ];
    realContent = intros[i % intros.length] + realContent;

    // Add professional outro/CTA
    realContent += `
    <hr />
    <h3>Bạn cần tư vấn lộ trình học chi tiết?</h3>
    <p>Đừng ngần ngại liên hệ với <strong>VanTrangEdu</strong> để được hỗ trợ miễn phí. Chúng tôi luôn sẵn sàng đồng hành cùng bạn trên con đường chinh phục tri thức.</p>
    <p><strong>Hotline:</strong> 096 244 5963 <br> <strong>Email:</strong> contact@vantrangedu.com</p>
    `;

    const excerpt = `Hướng dẫn chuyên sâu: ${realTitle}. Phân tích chi tiết, chiến lược thực chiến và lộ trình bài bản dành cho người học. Cập nhật mới nhất 2026.`;

    const imageList = verifiedImages[topic.cat] || verifiedImages['Default'];
    const image = imageList[i % imageList.length];

    const date = new Date();
    date.setDate(date.getDate() - getRandomInt(0, 60));
    date.setHours(getRandomInt(8, 22), getRandomInt(0, 59));
    const dateStr = date.toISOString();

    // 9. SQL Construction
    // IMPORTANT: 'author_id' = 1 to fix Constraint Error
    // IMPORTANT: 'category' = 'guide' to fix CHECK constraint. Real topic is in tags.
    batchRows.push(`(
    '${realTitle.replace(/'/g, "''")}',
    '${slug}',
    '${realContent.replace(/'/g, "''")}',
    '${excerpt.replace(/'/g, "''")}',
    'guide',
    '${topic.cat},${topic.tags}',
    'published',
    1,
    '${dateStr}',
    '${dateStr}',
    '${dateStr}',
    '${image}'
  )`);

    // COLLECT SITEMAP DATA
    sitemapUrls.push({
        loc: `https://vantrangedu.com/news/${slug}`,
        lastmod: dateStr.split('T')[0],
        changefreq: 'weekly',
        priority: 0.8
    });

    // 10. Batch Flush
    if (batchRows.length === batchSize || i === totalPosts - 1) {
        sql += `INSERT INTO posts (title, slug, content, excerpt, category, tags, status, author_id, publish_at, created_at, updated_at, featured_image) VALUES\n${batchRows.join(',\n')};\n\n`;
        batchRows = [];
    }
}

fs.writeFileSync('seed-100-posts.sql', sql);
console.log('SUCCESS: seed-100-posts.sql (V4 Professional) created.');

// ==========================================
// GENERATE SITEMAP.XML
// ==========================================
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Static Pages -->
    <url>
        <loc>https://vantrangedu.com/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://vantrangedu.com/news</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://vantrangedu.com/about</loc>
        <lastmod>2026-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://vantrangedu.com/contact</loc>
        <lastmod>2026-01-01</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.6</priority>
    </url>

    <!-- ENTITY SEO PAGES -->
    <url><loc>https://vantrangedu.com/ho-tro-tieng-anh</loc><priority>0.8</priority></url>
    <url><loc>https://vantrangedu.com/day-ngon-ngu</loc><priority>0.8</priority></url>
    <url><loc>https://vantrangedu.com/trung-tam-tieng-anh</loc><priority>0.8</priority></url>
    <url><loc>https://vantrangedu.com/english-support</loc><priority>0.8</priority></url>
    <url><loc>https://vantrangedu.com/language-center</loc><priority>0.8</priority></url>
    
    <!-- Dynamic News Posts -->
    ${sitemapUrls.map(url => `
    <url>
        <loc>${url.loc}</loc>
        <lastmod>${url.lastmod}</lastmod>
        <changefreq>${url.changefreq}</changefreq>
        <priority>${url.priority}</priority>
    </url>`).join('')}
</urlset>`;

// Write to frontend public directory
const sitemapPath = '..\\frontend\\public\\sitemap.xml';
try {
    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log(`SUCCESS: Sitemap updated at ${sitemapPath}`);
} catch (err) {
    console.error('Warning: Could not write sitemap.xml to frontend. Check path.', err);
}

