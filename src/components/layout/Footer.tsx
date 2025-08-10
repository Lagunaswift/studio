export function Footer() {
  return (
    <footer className="bg-muted py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} MealPlannerPro. All rights reserved.</p>
        <p>Your ultimate meal planning companion.</p>
      </div>
    </footer>
  );
}
