import { icons } from '../assets/icons';
export default function Icon({ name = 'Grid', size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
      dangerouslySetInnerHTML={{ __html: icons[name] || icons.Grid }}
    />
  );
}
