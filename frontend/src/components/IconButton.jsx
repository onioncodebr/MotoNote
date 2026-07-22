export function IconButton({ icon: Icon, size = 18, ...props }) {
  return (
    <button type="button" className="icon-button" {...props}>
      <Icon size={size} />
    </button>
  )
}
