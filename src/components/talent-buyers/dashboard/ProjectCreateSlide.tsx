import { Plus } from "lucide-react";

export function ProjectCreateSlideContent() {
  return (
    <div className="feature-carousel__create-card">
      <span className="feature-carousel__create-icon" aria-hidden>
        <Plus className="size-6" />
      </span>
      <span className="feature-carousel__create-label">Create project</span>
    </div>
  );
}
