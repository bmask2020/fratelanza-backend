async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    status: response.status,
    body,
  };
}

async function main() {
  const baseUrl = 'http://127.0.0.1:3000/api/v1';

  const login = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@fratelanza.com',
      password: 'Fratelanza@2026',
    }),
  });

  if (login.status !== 201) {
    throw new Error(`Login failed: ${JSON.stringify(login)}`);
  }

  const token = login.body.accessToken;
  const refreshToken = login.body.refreshToken;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const me = await requestJson(`${baseUrl}/auth/me`, {
    headers: authHeaders,
  });
  const dashboard = await requestJson(`${baseUrl}/dashboard/summary`, {
    headers: authHeaders,
  });
  const users = await requestJson(`${baseUrl}/admin/users`, {
    headers: authHeaders,
  });
  const createUser = await requestJson(`${baseUrl}/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: `live.user.${Date.now()}@fratelanza.com`,
      password: 'LivePassword@2026',
      role: 'EDITOR',
    }),
  });
  const createContact = await requestJson(`${baseUrl}/contacts`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Live Smoke Contact',
      email: `live.contact.${Date.now()}@example.com`,
      subject: 'Live smoke workflow',
      message: 'This contact is created automatically to verify the workflow endpoint.',
    }),
  });
  const contacts = await requestJson(`${baseUrl}/contacts?status=PENDING`, {
    headers: authHeaders,
  });

  const refreshed = await requestJson(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  const refreshedAuthHeaders = {
    Authorization: `Bearer ${refreshed.body?.accessToken ?? token}`,
  };

  const logout = refreshed.body?.refreshToken
    ? await requestJson(`${baseUrl}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshed.body.refreshToken }),
      })
    : null;

  const refreshAfterLogout = refreshed.body?.refreshToken
    ? await requestJson(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshed.body.refreshToken }),
      })
    : null;

  const listedUsers = Array.isArray(users.body?.items)
    ? users.body.items
    : Array.isArray(users.body)
      ? users.body
      : [];

  const listedContacts = Array.isArray(contacts.body?.items)
    ? contacts.body.items
    : Array.isArray(contacts.body)
      ? contacts.body
      : [];

  const meAfterRefresh = refreshed.body?.accessToken
    ? await requestJson(`${baseUrl}/auth/me`, {
        headers: refreshedAuthHeaders,
      })
    : null;

  const operationsUser =
    listedUsers.find((user) => user.email === 'operations@fratelanza.com') ??
    listedUsers[0] ??
    (me.body?.id
      ? {
          id: me.body.id,
          email: me.body.email,
        }
      : null);

  let workflow = null;

  const workflowContactId = createContact.body?.id || listedContacts[0]?.id;

  if (workflowContactId && operationsUser) {
    workflow = await requestJson(
      `${baseUrl}/contacts/${workflowContactId}/workflow`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          handledById: operationsUser.id,
        }),
      },
    );
  }

  console.log(
    JSON.stringify(
      {
        loginStatus: login.status,
        meStatus: me.status,
        meEmail: me.body?.email,
        dashboardStatus: dashboard.status,
        dashboardUsers: dashboard.body?.users,
        usersStatus: users.status,
        usersCount: listedUsers.length,
        usersMeta: users.body?.meta ?? null,
        createUserStatus: createUser.status,
        createdUserEmail: createUser.body?.email,
        createContactStatus: createContact.status,
        createdContactId: createContact.body?.id ?? null,
        contactsStatus: contacts.status,
        pendingContacts: listedContacts.length,
        contactsMeta: contacts.body?.meta ?? null,
        refreshStatus: refreshed.status,
        refreshUserEmail: refreshed.body?.user?.email ?? null,
        meAfterRefreshStatus: meAfterRefresh?.status ?? null,
        logoutStatus: logout?.status ?? null,
        refreshAfterLogoutStatus: refreshAfterLogout?.status ?? null,
        workflowStatus: workflow?.status ?? null,
        workflowHandledBy: workflow?.body?.handledBy?.email ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
