export type BackgroundWallpaperConfig = {
	mode: "banner" | "fullscreen" | "overlay" | "none";
	playerEnable?: boolean;
	src:
		| string
		| string[]
		| {
				desktop?: string | string[];
				mobile?: string | string[];
				playerUrl?: string | string[];
		  };
	common?: {
		dimOpacity?: number;
		playerMode?: "order" | "random";
		homeText?: {
			enable: boolean;
			title?: string;
			subtitle?: string | string[];
			titleSize?: string;
			subtitleSize?: string;
			typewriter?: {
				enable: boolean;
				speed: number;
				deleteSpeed: number;
				pauseTime: number;
			};
		};
		postInfo?: {
			mode: "description" | "meta";
		};
		navbar?: {
			transparentMode?: "semi" | "full" | "semifull";
			blur?: number;
		};
		waves?: {
			enable:
				| boolean
				| {
						desktop: boolean;
						mobile: boolean;
				  };
		};
		gradient?: {
			enable:
				| boolean
				| {
						desktop: boolean;
						mobile: boolean;
				  };
			height?: string;
		};
		carousel?: {
			enable: boolean;
			interval?: number;
			transitionEffect?: "fade" | "zoom" | "slide" | "kenburns";
		};
	};
	banner?: {
		position?: string;
	};
	overlay?: {
		zIndex?: number;
		opacity?: number;
		blur?: number;
		cardOpacity?: number;
	};
	fullscreen?: {
		position?: string;
	};
};
