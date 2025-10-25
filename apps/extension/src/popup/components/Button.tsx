export function Button({ children, ...props }: any) {
  return (
    <button
      {...props}
      style={{
        width: "100%",
        padding: 10,
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,.1)",
      }}
    >
      {children}
    </button>
  );
}
