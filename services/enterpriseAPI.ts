// services/enterpriseAPI.ts
import { API_BASE_URL } from '@/config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';


const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('authToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};

export const enterpriseAPI = {
  // Companies
  getCompanies: () => fetchWithAuth(`${API_BASE_URL}/api/enterprise/companies`).then(r => r.json()),
  getCompanyById: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/companies/${id}`).then(r => r.json()),
  createCompany: (data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/companies`, {
    method: 'POST', body: JSON.stringify(data)
  }).then(r => r.json()),
  updateCompany: (id: string, data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/companies/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteCompany: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/companies/${id}`, { method: 'DELETE' }),

  // Plants
  getPlantsByCompany: (companyId: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/plants/company/${companyId}`).then(r => r.json()),
  getPlantById: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/plants/${id}`).then(r => r.json()),
  createPlant: (data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/plants`, {
    method: 'POST', body: JSON.stringify(data)
  }).then(r => r.json()),
  updatePlant: (id: string, data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/plants/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }).then(r => r.json()),
  deletePlant: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/plants/${id}`, { method: 'DELETE' }),

  // Sites
  getSitesByPlant: (plantId: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/sites/plant/${plantId}`).then(r => r.json()),
  getSiteById: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/sites/${id}`).then(r => r.json()),
  createSite: (data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/sites`, {
    method: 'POST', body: JSON.stringify(data)
  }).then(r => r.json()),
  updateSite: (id: string, data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/sites/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteSite: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/sites/${id}`, { method: 'DELETE' }),

  // Units
  getUnitsBySite: (siteId: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/units/site/${siteId}`).then(r => r.json()),
  getUnitById: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/units/${id}`).then(r => r.json()),
  createUnit: (data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/units`, {
    method: 'POST', body: JSON.stringify(data)
  }).then(r => r.json()),
  updateUnit: (id: string, data: any) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/units/${id}`, {
    method: 'PUT', body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteUnit: (id: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/units/${id}`, { method: 'DELETE' }),

  // Enterprise Structure
  getEnterpriseStructure: (companyId: string) => fetchWithAuth(`${API_BASE_URL}/api/enterprise/structure/${companyId}`).then(r => r.json()),
};