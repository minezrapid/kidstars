# KidStars

Aplicație de recompense pentru copii cu sistem de stele, sarcini zilnice și recompense personalizabile.

## Setup rapid

### 1. Firebase — proiect nou
1. Mergi la [console.firebase.google.com](https://console.firebase.google.com)
2. **New Project** → numești `kidstars-prod`
3. **Authentication** → Sign-in methods → activează **Email/Password**
4. **Firestore Database** → Create database → Start in **test mode** (schimbăm regulile după)
5. **Project Settings** → Your apps → **Web** → copiezi config-ul

### 2. Variabile de mediu
```bash
cp .env.example .env.local
# Completează cu valorile din Firebase
```

### 3. Reguli Firestore
În Firebase Console → Firestore → Rules → copiezi conținutul din `firestore.rules`

### 4. Resend (emailuri invitații)
1. Mergi la [resend.com](https://resend.com) → Sign up gratuit
2. **API Keys** → Create API Key → copiezi în `.env.local`

### 5. Rulează local
```bash
npm install
npm run dev
# Deschide http://localhost:3000
```

### 6. Deploy Vercel
```bash
npm install -g vercel
vercel --prod
# Adaugă variabilele de mediu în Vercel Dashboard → Settings → Environment Variables
```

---

## Structura aplicației

```
/register          → Înregistrare admin (prima dată)
/admin/setup       → Wizard configurare inițială
/admin             → Dashboard admin
/admin/settings    → Editare sarcini, recompense, bonusuri
/admin/children    → Vizualizare progres copii
/admin/invites     → Trimitere invitații

/register/child?token=XXX  → Înregistrare copil (via link invitație)
/child             → Dashboard copil (sarcini + recompense)

/view/:token       → Vizualizare guest (read-only, fără autentificare)
```

## Roluri

| Rol | Acces |
|-----|-------|
| **Admin** | Configurare completă, invitații, vizualizare toate datele |
| **Copil** | Bifat sarcini, răscumpărat recompense, văzut istoric |
| **Guest** | Vizualizare read-only via link public |

## Stack
- React 18 + Vite
- Firebase Auth + Firestore
- Resend (emailuri)
- React Router v6
- Deploy: Vercel
