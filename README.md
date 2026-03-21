# Prince Chapel by the Sea AME

Website for Prince Chapel by the Sea African Methodist Episcopal Church, La Jolla, CA.

## Structure

```
princechapel/
├── index.html       # Main page
├── css/
│   └── style.css    # All styles
└── js/
    └── main.js      # All JavaScript (Supabase, admin panel, rendering)
```

## Features

- Church info: service times, about, events, leadership, contact
- YouTube livestream link
- Online giving via PayPal
- Admin panel (hidden, Shift+A to trigger login) — Google OAuth via Supabase
- Live content editing: events, staff, sermons stored in Supabase

## Setup

1. Create a [Supabase](https://supabase.com) project
2. Enable Google OAuth under Authentication > Providers
3. Update `js/main.js` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
4. Add admin email addresses to the `ADMIN_EMAILS` array in `js/main.js`
5. Create the following tables in Supabase:
   - `events` — `month`, `day`, `title`, `time`, `desc`, `sort_order`
   - `staff` — `name`, `initials`, `role`, `bio`, `sort_order`
   - `sermons` — `title`, `date`, `speaker`, `url`
