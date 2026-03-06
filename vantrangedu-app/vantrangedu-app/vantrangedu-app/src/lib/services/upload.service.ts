import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Vì R2 của Cloudflare tương thích chuẩn S3 API của AWS nên ta xài S3Client
const s3 = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
	},
});

export async function generateR2UploadUrl(
	fileName: string,
	contentType: string,
) {
	const command = new PutObjectCommand({
		Bucket: "vantrangedu-files",
		Key: `cccd/${Date.now()}-${fileName.replace(/\s+/g, "-")}`,
		ContentType: contentType,
	});

	// URL có hiệu lực 5 phút để Client đẩy ảnh thẳng lên R2 Cloudflare
	const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
	return {
		uploadUrl: signedUrl,
		publicUrl: `https://files.vantrangedu.com/${command.input.Key}`, // URL view (Cần bind domain public ở CF R2 dashboard)
	};
}
