import { DOMAIN, NETWORK_CONSTANTS } from './constant';


/* ------------------------------------------------------------------
   TYPES
-------------------------------------------------------------------*/

export interface ApiRequestObject {
  path: string;
  body?: Record<string, any>;
  Token?: string |any;
}

export interface ApiResponse<T = any> {
  status?: boolean;
  message?: string;
  data?: T;
  token?: string;
  [key: string]: any;
}

/* ------------------------------------------------------------------
   POST API (JSON)
-------------------------------------------------------------------*/

export function javascriptPost<T = any>(
  apiRequestObject: ApiRequestObject
): Promise<ApiResponse<T>> {
  const path = `${DOMAIN.BASE}${apiRequestObject.path}`;
  console.log(DOMAIN.BASE, "---------------path---------------");
  console.log(path, "---------", apiRequestObject);

  const token = apiRequestObject.Token ?? "";

  return new Promise((resolve, reject) => {
    const request: RequestInit = {
      method: 'POST',
      headers: {
         'Accept': 'application/json',     
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(apiRequestObject.body || {}),
    };

    const timeoutId = setTimeout(() => {
      reject("timeout");
    }, NETWORK_CONSTANTS.connectionTimeout);

    fetch(path, request)
      .then((response) => {
        clearTimeout(timeoutId);

        response.json()
          .then((jsonResponse: ApiResponse<T>) => {
            resolve(jsonResponse);
          })
          .catch(() => {
            resolve(response as any);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
export function javascriptPostLocal<T = any>(
  apiRequestObject: ApiRequestObject
): Promise<ApiResponse<T>> {
  const path = `${DOMAIN.LOCAL}${apiRequestObject.path}`;
  console.log(path, "---------------path---------------");
  console.log(path, "---------", apiRequestObject);

  const token = apiRequestObject.Token ?? "";

  return new Promise((resolve, reject) => {
    const request: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(apiRequestObject.body || {}),
    };

    const timeoutId = setTimeout(() => {
      reject("timeout");
    }, NETWORK_CONSTANTS.connectionTimeout);

    fetch(path, request)
      .then((response) => {
        clearTimeout(timeoutId);

        response.json()
          .then((jsonResponse: ApiResponse<T>) => {
            resolve(jsonResponse);
          })
          .catch(() => {
            resolve(response as any);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/* ------------------------------------------------------------------
   GET API
-------------------------------------------------------------------*/

export function javascriptGet<T = any>(
  apiRequestObject: ApiRequestObject,
  mockURL: string = ''
): Promise<ApiResponse<T>> {
  let path = `${DOMAIN.BASE}${apiRequestObject.path}`;
  if (mockURL.length > 0) {
    path = mockURL;
  }

  const token = apiRequestObject.Token ?? "";

  return new Promise((resolve, reject) => {
    const request: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const timeoutId = setTimeout(() => {
      reject("timeout");
    }, NETWORK_CONSTANTS.connectionTimeout);

    fetch(path, request)
      .then((response) => {
        clearTimeout(timeoutId);

        response.json()
          .then((jsonResponse: ApiResponse<T>) => {
            resolve(jsonResponse);
          })
          .catch(() => {
            resolve(response as any);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
export function javascriptGetLocal<T = any>(
  apiRequestObject: ApiRequestObject,
  mockURL: string = ''
): Promise<ApiResponse<T>> {
  let path = `${DOMAIN.LOCAL}${apiRequestObject.path}`;

  if (mockURL.length > 0) {
    path = mockURL;
  }

  const token = apiRequestObject.Token ?? "";

  return new Promise((resolve, reject) => {
    const request: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const timeoutId = setTimeout(() => {
      reject("timeout");
    }, NETWORK_CONSTANTS.connectionTimeout);

    fetch(path, request)
      .then((response) => {
        clearTimeout(timeoutId);

        response.json()
          .then((jsonResponse: ApiResponse<T>) => {
            resolve(jsonResponse);
          })
          .catch(() => {
            resolve(response as any);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
