import { config } from "@vue/test-utils";

// Configuración global para las pruebas
config.global.stubs = {
	ToastMessage: true,
};
