export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    return handleCheck(env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCheck(env));
  }
};

async function handleCheck(env) {
  try {
    const dataSource = "https://anywherecum.pages.dev/videos.json";

    const res = await fetch(dataSource);
    const videos = await res.json();

    if (!Array.isArray(videos)) {
      throw new Error("Invalid videos.json");
    }

    const lastId = await env.KV.get("LAST_UPDATED");
    const latest = videos[0];

    if (!latest) {
      return new Response(JSON.stringify({ message: "No videos found" }));
    }

    if (lastId === latest.id) {
      return new Response(JSON.stringify({ message: "No new video" }));
    }

    await env.KV.put("LAST_UPDATED", latest.id);
    await env.KV.put("LAST_DATE", latest.date);

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${env.ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: env.ONESIGNAL_APP_ID,

        headings: { en: latest.title },
        contents: { en: latest.title },

        url: "https://anywherecum.pages.dev/",

        big_picture: `https://anywherecum.pages.dev/images/${latest.thumbnail}`
      })
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      last_id: latest.id,
      last_date: latest.date,
      notification: result
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);

    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
