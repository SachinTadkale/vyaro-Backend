import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testTranslation() {
  const apiUrl = "https://translate.argosopentech.com/translate";
  const apiKey = process.env.TRANSLATE_API_KEY;
  const text = "Tomato";
  const target = "mr";

  console.log(`Testing translation at ${apiUrl}`);
  console.log(`Text: "${text}", Target: "${target}"`);

  try {
    const res = await axios.post(
      apiUrl!,
      {
        q: text,
        source: "en", // force en to avoid auto-detect issues
        target: target,
        format: "text",
        ...(apiKey ? { api_key: apiKey } : {}),
      },
      { timeout: 10000 }
    );

    console.log("Response data:", JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    if (err.response) {
      console.error("API Error Status:", err.response.status);
      console.error("API Error Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error:", err.message);
    }
  }
}

testTranslation();
