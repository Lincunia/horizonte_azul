import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('incrementa el contador al hacer click', async () => {
    const wrapper = mount(App)

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Contador: 1')
  })
})