import type { SponsorConfig } from "../types/sponsorConfig";

export const sponsorConfig: SponsorConfig = {
	title: "",
	description: "",
	usage: "",
	showSponsorsList: false,
	showComment: false,
	showButtonInPost: false,
	methods: [
		{
			name: "Alipay",
			icon: "fa7-brands:alipay",
			qrCode: "",
			link: "",
			description: "",
			enabled: false,
		},
		{
			name: "WeChat",
			icon: "fa7-brands:weixin",
			qrCode: "",
			link: "",
			description: "",
			enabled: false,
		},
	],
	sponsors: [],
};
