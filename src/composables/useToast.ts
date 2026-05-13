import { ref, type Ref } from "vue";

type messageClass = "alert alert-success" | "alert alert-danger" | "alert alert-warning";

export interface ToastMessage {
	type: messageClass;
	text: string;
}

const message = ref<ToastMessage | null>(null);

let timeoutId: number | null = null;

export function useToast() {
	const showMessage = (
		type: messageClass = "alert alert-warning",
		text: string,
		duration: number = 5000,
	) => {
		message.value = { type, text };
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		//message.value = { type, text };

		if(duration === -1){
			return;
		}

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
