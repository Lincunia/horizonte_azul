export const calculuateDaysStaying = (startDate: string, endDate: string): number => {
	let startDateAsDate = new Date(startDate);
	let endDateAsDate = new Date(endDate);
	let diffTime: number = Math.abs(endDateAsDate.getTime() - startDateAsDate.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateUnitValue = (subtotal: number, startDate: string, endDate: string): number => {
	return subtotal / calculuateDaysStaying(startDate, endDate);
}
