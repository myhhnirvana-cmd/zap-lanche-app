import React from 'react';
import { RestaurantQrCodeCard } from '../loyalty/RestaurantQrCodeCard';
import { Restaurant } from '../../types';

interface CheckInQrSectionProps {
  restaurant: Restaurant;
}

export const CheckInQrSection: React.FC<CheckInQrSectionProps> = ({ restaurant }) => {
  return (
    <div className="rounded-3xl bg-bg-surface border border-border-muted p-6 shadow-xl space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-text-primary font-display">
          QR Code de Check-in
        </h3>
        <p className="text-sm text-text-secondary">
          Imprima e disponibilize o código perto do caixa ou entregue junto ao pedido. 
          <strong className="text-orange-400"> Permita o acesso ao QR Code somente após a compra.</strong>
        </p>
      </div>
      
      <RestaurantQrCodeCard restaurant={restaurant} />
    </div>
  );
};
