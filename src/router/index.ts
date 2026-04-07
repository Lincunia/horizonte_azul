import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import TableView from '../views/TableView.vue';

const routes = [
	{
		path: '/',
		name: 'home',
		component: HomeView
	},
	{
		path: '/login',
		name: 'login',
		component: LoginView
	},
	{
		path: '/register',
		name: 'register',
		component: RegisterView
	},
	{ // REMEMBER TO DELETE THIS SHIT
		path: '/tableUser',
		name: 'tableUser',
		component: TableView
	}
];

const router = createRouter({
	history: createWebHistory(),
	routes
});

export default router;
