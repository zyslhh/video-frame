import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// --- 类型定义 ---
interface VideoScrollSequenceProps {
  /** 第一帧图片的 URL (用于即时展示) */
  firstFrameSrc: string; // 更改为必需的 prop
  /** 视频帧的总数量 */
  totalFrames?: number;
  /** 根据索引获取帧图片路径的函数 (注意：此函数应从第二帧开始) */
  getFramePath?: (index: number) => string;
  /** 定义滚动距离与帧数关系的乘数。 */
  scrollSensitivity?: number;
  /** 组件在屏幕上固定时的 CSS 高度 */
  pinHeight?: string;
}
// 假设的默认值
const DEFAULT_FRAME_COUNT = 48;

const DEFAULT_FRAME_PATH_FORMAT = (index: number) =>
  `https://static-res-www.imoo.com/US/images/products/x10/pc/animate1-1/animate1-${String(
    index
  )}.webp`;

const VideoScrollSequence: React.FC<VideoScrollSequenceProps> = ({
  firstFrameSrc, // 接收第一帧路径
  totalFrames = DEFAULT_FRAME_COUNT,
  getFramePath = DEFAULT_FRAME_PATH_FORMAT,
  scrollSensitivity = 15,
  pinHeight = "100vh",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textBoxRef = useRef<HTMLDivElement>(null);
  const firstImageRef = useRef<HTMLImageElement>(null); // 新增：用于获取第一帧图片的尺寸

  // 存储预加载的 Image 对象，第一个元素就是第一帧
  const [imageFrames, setImageFrames] = useState<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstImageLoaded, setIsFirstImageLoaded] = useState(false); // 跟踪第一帧是否已加载并设置尺寸

  const totalScrollDistance = useMemo(() => {
    return totalFrames * scrollSensitivity;
  }, [totalFrames, scrollSensitivity]);

  // 绘制当前帧的函数
  const drawFrame = useCallback(
    (
      index: number,
      canvas: HTMLCanvasElement,
      context: CanvasRenderingContext2D
    ) => {
      // frameIndex 对应 imageFrames 数组的索引 (0 到 totalFrames - 1)
      const frameIndex = Math.min(
        totalFrames - 1,
        Math.max(0, Math.floor(index))
      );
      const img = imageFrames[frameIndex];

      if (img) {
        const imgWidth = img.width;
        const imgHeight = img.height;

        if (canvas.width !== imgWidth || canvas.height !== imgHeight) {
          canvas.width = imgWidth;
          canvas.height = imgHeight;
        }

        context.clearRect(0, 0, imgWidth, imgHeight);
        context.drawImage(img, 0, 0, imgWidth, imgHeight);
      }
    },
    [imageFrames, totalFrames]
  );

  // 1. 预加载所有图像帧 (包括第一帧)
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      const loadedImages: HTMLImageElement[] = [];
      const imagePromises: Promise<void>[] = [];

      // A. 加载第一帧 (因为它需要放入 imageFrames 数组的索引 0)
      const firstImg = new Image();
      const firstPromise = new Promise<void>((resolve) => {
        firstImg.onload = () => {
          loadedImages[0] = firstImg;
          setIsFirstImageLoaded(true); // 标记第一帧图片对象已加载
          resolve();
        };
        firstImg.onerror = () => {
          console.error(`Failed to load initial frame: ${firstFrameSrc}`);
          // 即使失败也要 resolve，避免阻塞
          resolve();
        };
      });
      firstImg.src = firstFrameSrc;
      imagePromises.push(firstPromise);

      // B. 加载剩余帧 (从 index = 2 开始，对应数组索引 1)
      for (let i = 2; i <= totalFrames; i++) {
        const path = getFramePath(i);
        const img = new Image();

        const promise = new Promise<void>((resolve) => {
          img.onload = () => {
            loadedImages[i - 1] = img; // 索引 i-1
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to load image: ${path}`);
            resolve();
          };
        });
        img.src = path;
        imagePromises.push(promise);
      }

      await Promise.all(imagePromises);

      const successfulLoads = loadedImages.filter(Boolean);
      setImageFrames(successfulLoads);
      // 只有当总帧数加载完毕，才设置为 false
      if (successfulLoads.length === totalFrames) {
        setIsLoading(false);
      } else {
        console.warn(
          `只成功加载了 ${successfulLoads.length} / ${totalFrames} 帧，动画可能不完整。`
        );
        setIsLoading(false);
      }
    };

    loadImages();
  }, [totalFrames, getFramePath, firstFrameSrc]);

  // 2. 设置 GSAP ScrollTrigger 动画
  useEffect(() => {
    // 只有当所有帧都加载完毕 (isLoading = false) 且引用存在时才运行
    if (
      isLoading ||
      imageFrames.length !== totalFrames ||
      !canvasRef.current ||
      !containerRef.current ||
      !textBoxRef.current
    )
      return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const textBox = textBoxRef.current;

    if (!context) return;

    // 绘制第一帧 (确保 Canvas 在 ScrollTrigger 启动前就准备好)
    drawFrame(0, canvas, context);

    const frameObject = { index: 0 };

    // --- 文本框动画配置 (与之前相同) ---
    const START_FRAME = 30;
    // const END_FRAME = 50;

    const startTime = START_FRAME / (totalFrames - 1);
    // const endTime = END_FRAME / (totalFrames - 1);

    gsap.set(textBox, {
      y: 100,
      opacity: 0,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        start: "top top",
        end: `+=${totalScrollDistance}`,
        scrub: 0.1,
        onUpdate: (self) => {
          const scrollProgress = self.progress;
          const newIndex = scrollProgress * (totalFrames - 1);
          frameObject.index = newIndex;

          drawFrame(frameObject.index, canvas, context);
        },
      },
    });

    tl.to(
      frameObject,
      {
        index: totalFrames - 1,
        ease: "none",
        duration: 1,
      },
      0
    );

    tl.to(
      textBox,
      {
        y: 0,
        opacity: 1,
        ease: "power2.out",
      },
      startTime
    );

    // 清理函数
    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, [isLoading, imageFrames, totalFrames, totalScrollDistance, drawFrame]);

  return (
    <div
      ref={containerRef}
      className="video-scroll-container"
      style={{
        width: "100%",
        height: pinHeight,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="canvas-wrapper"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* 1. 加载时显示的第一帧图片 */}
        {isLoading ? (
          <img
            ref={firstImageRef}
            src={firstFrameSrc}
            alt="Initial frame of animation"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: isFirstImageLoaded ? "block" : "none", // 确保图片加载失败时不显示
              // 保持绝对定位，确保它在加载完成前不会影响 Canvas 的位置
              position: "absolute",
            }}
          />
        ) : (
          // 2. 加载完成后显示 Canvas
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
            }}
          />
        )}
      </div>

      {/* 动画文本框元素 (保持不变) */}
      <div ref={textBoxRef} className="text-box">
        {/* ... 您的文本内容 ... */}
        <div className="gradient-text">
          <div className="text-1 text-white">imoo's first</div>
          <div className="text-2">detachable</div>
          <div className="text-3">watch phone!</div>
        </div>
        <div className="text-4 text-[#817AD8] small-gradient">
          Flip &amp; detach design
          <br />
          front and rear dual
          <br />
          cameras
        </div>
      </div>
    </div>
  );
};

export default VideoScrollSequence;
