import Lottie from 'lottie-react';
import validatingIdentityAnimation from '@/assets/animations/validatingIdentity.json';

const ThirdStep = () => {
  return (
    <div className="p-4">
      <p className="text-sm font-extralight text-primary-50 px-8">
        Uno de nuestros agentes está validando tu identidad. Este proceso puede
        tardar de 1 a 2 días hábiles.
      </p>
      <Lottie
        animationData={validatingIdentityAnimation}
        loop={true}
        className="-translate-y-10 max-h-60"
      />
    </div>
  );
};

ThirdStep.displayName = 'ThirdStep';

export { ThirdStep };
