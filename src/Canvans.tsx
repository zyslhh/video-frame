import { useEffect } from "react";

export default function Canvans() {
  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    canvas.width = 1920;
    canvas.height = 1080;
    img.src = "https://picsum.photos/1920/1080";
    img.onload = () => {
      ctx && ctx.drawImage(img, 0, 0);
    };
  }, []);
  return (
    <div>
      <canvas id="canvas" width="100%" height="1080"></canvas>
    </div>
  );
}
