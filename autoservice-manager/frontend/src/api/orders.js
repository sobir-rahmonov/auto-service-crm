import api from './client'

const post = async (url, body) => (await api.post(url, body)).data
const del = async (url) => (await api.delete(url)).data

export async function listOrders(params) {
  return (await api.get('/orders/', { params })).data
}
export const createOrder = (payload) => post('/orders/', payload)
export async function getOrder(id) {
  return (await api.get(`/orders/${id}/`)).data
}

export const assignMechanic = (id, mechanic) => post(`/orders/${id}/assign/`, { mechanic })
export const setDiagnosis = (id, diagnosis) => post(`/orders/${id}/diagnosis/`, { diagnosis })
export const addService = (id, service) => post(`/orders/${id}/add-service/`, { service })
export const removeService = (id, itemId) => del(`/orders/${id}/remove-service/${itemId}/`)
export const addPart = (id, part, quantity) => post(`/orders/${id}/add-part/`, { part, quantity })
export const removePart = (id, itemId) => del(`/orders/${id}/remove-part/${itemId}/`)
export const changeStatus = (id, status) => post(`/orders/${id}/change-status/`, { status })
export async function saveNotes(id, payload) {
  return (await api.patch(`/orders/${id}/notes/`, payload)).data
}
export const requestPart = (id, part, quantity, comment) =>
  post(`/orders/${id}/request-part/`, { part, quantity, comment })

export async function getReview(orderId) {
  const { data } = await api.get('/orders/reviews/', { params: { order: orderId } })
  return data.results[0] || null
}
export const createReview = (order, rating, comment) =>
  post('/orders/reviews/', { order, rating, comment })