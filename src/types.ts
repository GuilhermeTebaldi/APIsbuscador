/**
 * Types representing free APIs and our search queries.
 */

export interface QueryParamInfo {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface PathParamInfo {
  name: string;
  type: 'string' | 'number';
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface EndpointInfo {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  queryParams?: QueryParamInfo[];
  pathParams?: PathParamInfo[];
  bodyTemplate?: string; // JSON body string for testing POST/PUT requests
}

export interface FreeApiInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  url: string; // Base URL
  docsUrl: string; // GitHub or docs link
  endpoints: EndpointInfo[];
  auth: 'none' | 'apiKey' | 'other';
  searchQueryMatches?: string[];
  sampleResponse?: any; // A static sample of what this API returns, shown beautifully on front page
}

export interface SearchResponse {
  correctedQuery: string; // The query processed and cleaned (e.g., corrected from typos)
  apis: FreeApiInfo[];
  explanation: string; // Summary of what was found
}
