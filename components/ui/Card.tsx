'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}
        {...props}
      >
        {(title || description) && (
          <div className="mb-4">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
