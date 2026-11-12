import React from 'react';
import { RestaurantQrCodeCard } from '../loyalty/RestaurantQrCodeCard';
import { HelpText } from '../common/HelpText';
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
        <HelpText>
          Cada check-in validado concede 5 pontos locais ao cliente, com intervalo mínimo de 2 horas entre check-ins no mesmo restaurante. Imprima e disponibilize o código perto do caixa. Permita o acesso ao QR Code somente após o atendimento.
        </HelpText>
      </div>
      
      <RestaurantQrCodeCard restaurant={restaurant} />
    </div>
  );
};
