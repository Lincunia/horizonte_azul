import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import Home from './Home.vue'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: pushMock
    })
}))

describe('Redirecciones múltiples', () => {
    beforeEach(() => {
        pushMock.mockClear()
    })

    it('redirige a /login', async () => {
        const wrapper = mount(Home)

        await wrapper.find('[data-test="btn-login"]').trigger('click')

        expect(pushMock).toHaveBeenCalledWith('/login')
    })

    it('redirige a /register', async () => {
        const wrapper = mount(Home)

        await wrapper.find('[data-test="btn-register"]').trigger('click')

        expect(pushMock).toHaveBeenCalledWith('/register')
    })
})