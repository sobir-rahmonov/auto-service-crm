export default function Profile() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl lg:text-3xl font-bold">Profil</h1>
        <p className="text-muted">
          Login: <b className="text-ink">{user.username}</b>, rol: <b className="text-ink">{ROLE_LABELS[user.role]}</b>
        </p>
      </header>
      <InfoForm />
      <PasswordForm />
    </div>
  )
}