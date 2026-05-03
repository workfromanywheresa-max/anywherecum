import { createVideoBox } from "./views2.js";

const params = new URLSearchParams(window.location.search);
const videoId = params.get("video");

fetch("videos.json")
  .then(res => res.json())
  .then(videos => {

    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const container = document.getElementById("videoContainer");

    // SAME EXACT BOX AS HOMEPAGE
    container.appendChild(createVideoBox(video, 0));
  });
