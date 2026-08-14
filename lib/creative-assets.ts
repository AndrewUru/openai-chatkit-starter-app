export type GeneratedCover = {
  source: "generated";
  alt: string;
  mimeType: "image/webp" | "image/jpeg" | "image/png";
  data: string;
  width: number;
  height: number;
};

export type UnsplashCover = {
  source: "unsplash";
  alt: string;
  url: string;
  width: number;
  height: number;
  downloadLocation: string;
  attribution: {
    photographerName: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
};

export type EmptyCover = {
  source: "none";
  alt: string;
  reason?: string;
};

export type CoverAsset = GeneratedCover | UnsplashCover | EmptyCover;

export type CreativeWorkflowResponse = {
  success: boolean;
  message?: string;
  article?: string;
  cover?: CoverAsset;
  coverPrompt?: string;
};
