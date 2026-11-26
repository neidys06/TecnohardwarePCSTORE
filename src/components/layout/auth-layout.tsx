import { Outlet } from 'react-router'

import { BrandPanel } from '@/components/app/brand'

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-card lg:grid lg:h-dvh lg:grid-cols-2">
      <div className="p-3 md:mx-auto md:max-w-[620px] md:p-4 lg:order-2 lg:mx-0 lg:h-dvh lg:max-w-none">
        <div className="lg:hidden">
          <BrandPanel compact />
        </div>
        <div className="hidden h-full lg:block">
          <BrandPanel />
        </div>
      </div>
      <div className="flex flex-col px-5 md:px-6 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:px-8">
        <div className="mx-auto my-auto flex w-full max-w-[440px] flex-col gap-7 pt-4 pb-10 lg:max-w-[420px] lg:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
