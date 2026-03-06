export async function extractCCCDInfo(imageUrl: string) {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_D1_TOKEN; // Có thể dùng token AI riêng

	// Model Llama 3.2 Vision (11B) cực kì khủng trên nền tảng Cloudflare Workers AI
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: [
					{
						role: "user",
						content: [
							{
								type: "image_url",
								image_url: { url: imageUrl },
							},
							{
								type: "text",
								text: 'Analyze this Vietnamese ID card (CCCD) and extract the following information. Return ONLY a valid JSON object with absolutely no markdown wrapping, no extra text formatting like ```json. The JSON keys MUST be exactly: {"id_number": "...", "full_name": "...", "dob": "DD/MM/YYYY"}. If you cannot read it due to blurriness, return those fields as empty strings.',
							},
						],
					},
				],
			}),
		},
	);

	const data = (await response.json()) as any;
	if (!data?.success || !data?.result?.response) {
		throw new Error("Failed to process CCCD by AI");
	}

	// Parse JSON từ phản hồi AI
	try {
		const rawText = data.result.response;
		return JSON.parse(rawText);
	} catch (e) {
		console.error("AI parse Error:", data.result.response);
		return { id_number: "", full_name: "", dob: "" };
	}
}
