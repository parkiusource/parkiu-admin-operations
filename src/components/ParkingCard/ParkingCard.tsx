import { MapPin, DollarSign, Car } from 'lucide-react';

interface ParkingCardProps {
  parking: {
    id: string;
    name: string;
    address: string;
    available_spaces: number;
    price_per_hour: number;
  };
}

export const ParkingCard = ({ parking }: ParkingCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{parking.name}</h3>
      <div className="flex items-center text-gray-600 mb-2">
        <MapPin className="w-4 h-4 mr-1" />
        <span>{parking.address}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-gray-600">
          <Car className="w-4 h-4 mr-1" />
          <span>{parking.available_spaces} espacios</span>
        </div>
        <div className="flex items-center text-primary">
          <DollarSign className="w-4 h-4 mr-1" />
          <span>${parking.price_per_hour}/h</span>
        </div>
      </div>
    </div>
  );
};
