import clsx from 'clsx';

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const sizeCls = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : '';
  const variantCls = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';
  return (
    <button className={clsx(variantCls, sizeCls, className)} {...props}>
      {children}
    </button>
  );
}
