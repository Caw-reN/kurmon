
const variantClasses = {
  default:'',
  elevated:'shadow-xs',
  outlined:'bg-transparent shadow-none',
  gradient:'bg-gradient-to-br from-primary to-primary-mid text-primary-foreground border-none shadow-xs',
  accent:'bg-accent/10 border border-accent',
};

const Card = ({
  children,
  variant ='default',
  hoverable = false,
  padding ='p-5',
  className ='',
  ...props
}) => {
  return (
    <ShadcnCard
      className={[
        variantClasses[variant] ?? variantClasses.default,
        hoverable ?'cursor-pointer hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200' :'',
        className,
      ].filter(Boolean).join('')}
      {...props}
    >
      <CardContent className={`${padding} p-0 sm:p-0`}>
        {children}
      </CardContent>
    </ShadcnCard>
  );
};

export default Card;
