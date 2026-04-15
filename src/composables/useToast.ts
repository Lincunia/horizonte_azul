import { ref, type Ref } from "vue";

export interface ToastMessage {
	type: "success" | "error";
	text: string;
}

// Estado global para el toast
const message = ref<ToastMessage | null>(null);
let timeoutId: number | null = null;

export function useToast() {
	const showMessage = (
		type: "success" | "error",
		text: string,
		duration: number = 5000,
	) => {
		message.value = { type, text };
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		message.value = { type, text };

		timeoutId = setTimeout(() => {
			message.value = null;
			timeoutId = null;
		}, duration);
	};

	const hideMessage = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		message.value = null;
	};

	return {
		message: message as Ref<ToastMessage | null>,
		showMessage,
		hideMessage,
	};
}
