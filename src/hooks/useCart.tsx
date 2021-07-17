import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart') //busca dados do localstorage

     if (storagedCart) {
       return JSON.parse(storagedCart); //JSON parse transforma em valor original array de produtos
     }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() =>{
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  })

  const addProduct = async (productId: number) => {
    try {
      //criar um novo array para manter imutabilidade
      const updatedCart = [...cart]; 

      //verificar se o produto já existe no carrinho pelo id do produto
      const productExists = updatedCart.find(product => product.id === productId); 
      
      //chamando rota do estoque pelo id
      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      //validacao do estoque atual verificando se o produto existe no carrinho
      const currentAmount = productExists ? productExists.amount : 0;
      
      //quantidade desejada do produto
      const amount = currentAmount + 1;

      // Valida quantidade desejada for maior que estoque
      if (amount > stockAmount) {
       toast.error('Quantidade solicitada fora de estoque');
       return;
      }
      // Valida se o produto existe de fato
      if (productExists) {
        productExists.amount = amount; //atualiza quantidade
      } else {
        const product = await api.get(`/products/${productId}`);

        //puxar todos os dados do Product e retornar o amount
        const newProduct = {
          ...product.data,
          amount: 1
        }
        //atualizar o updatedCart com o novo produto
        updatedCart.push(newProduct); 
      }
      setCart(updatedCart); // atualizando os dados para dentro do carrinho

    
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product =>  product.id === productId);

      if ( productIndex >= 0 ) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if ( amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if( amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
