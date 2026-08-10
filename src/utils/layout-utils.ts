import { backgroundWallpaper } from "../config";

export type BackgroundImages = {
	desktop: string[];
	mobile: string[];
	images: string[];
	isMultiple: boolean;
};

const toArray = (src: string | string[] | undefined): string[] => {
	if (!src) return [];
	if (Array.isArray(src)) return src;
	return [src];
};

export const getBackgroundImages = (): BackgroundImages => {
	const bgSrc = backgroundWallpaper.src;
	const images =
		typeof bgSrc === "object" && bgSrc !== null && !Array.isArray(bgSrc)
			? toArray(bgSrc.desktop || bgSrc.mobile)
			: toArray(bgSrc);
	return {
		desktop: images,
		mobile: images,
		images,
		isMultiple: images.length > 1,
	};
};

export const getDefaultBackground = (): string => {
	const images = getBackgroundImages();
	return images.images[0] || "";
};

export const isHomePage = (pathname: string): boolean => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	const baseUrlNoSlash = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

	return (
		pathname === baseUrl || pathname === baseUrlNoSlash || pathname === "/"
	);
};

export const getBannerOffset = (position = "center"): string => {
	const bannerOffsetByPosition = {
		top: "100vh",
		center: "50vh",
		bottom: "0",
	};
	return (
		bannerOffsetByPosition[position as keyof typeof bannerOffsetByPosition] ||
		"50vh"
	);
};
