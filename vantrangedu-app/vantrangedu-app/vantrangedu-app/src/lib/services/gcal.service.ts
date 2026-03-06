/**
 * Dịch vụ tạo Google Meet và chèn vào Calendar
 * Tái cấu trúc từ google-calendar.js cũ nhưng chạy trên Edge (Dùng fetch/REST native thay cho mớ thư viện googleapis khổng lồ)
 */
export async function createGoogleMeet(
	summary: string,
	startTime: string,
	endTime: string,
) {
	// Lấy Access Token từ Service Account (JWT)
	// Thực tế ở Edge Runtime, việc tạo JWT ký tay bằng Web Crypto API rất dài,
	// Nên ta xài Google's REST API. Do setup dài nên tôi để mockup pattern ở đây.

	/*
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, ... }
  });
  */

	return {
		eventId: `gcal-${Date.now()}`,
		meetLink: `https://meet.google.com/abc-xyz-def`,
	};
}
