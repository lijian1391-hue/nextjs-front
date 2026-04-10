"use client"

import { Dialog, Transition } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { Fragment } from "react"
import X from "@modules/common/icons/x"
import OptionSelect from "./option-select"

type VariantSelectorSheetProps = {
  isOpen: boolean
  close: () => void
  product: HttpTypes.StoreProduct
  options: Record<string, string | undefined>
  updateOptions: (id: string, value: string) => void
  disabled: boolean
}

const VariantSelectorSheet = ({
  isOpen,
  close,
  product,
  options,
  updateOptions,
  disabled,
}: VariantSelectorSheetProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75] small:hidden" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-x-0 bottom-0">
          <Transition.Child
            as={Fragment}
            enter="transition-transform duration-300 ease-out"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transition-transform duration-200 ease-in"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <Dialog.Panel className="bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="flex justify-between items-center px-6 pb-4">
                <span className="text-large-semi">Select options</span>
                <button onClick={close}>
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 pb-8 flex flex-col gap-y-6">
                {(product.options || []).map((option) => (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={updateOptions}
                      title={option.title ?? ""}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

export default VariantSelectorSheet
