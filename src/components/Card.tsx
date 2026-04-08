
type CardProps = {
  title: string;
  description: string;
};

export function Card({ title, description }: CardProps) {
  return (
    <div className="p-4 rounded-xl bg-white shadow-md">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

export function CardGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {children}
    </div>
  );
}