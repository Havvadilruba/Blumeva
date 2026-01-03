export const getAppliedOffer=(data,salePrice)=>{
  let offer=0;
  if(data?.productOffer?.length>0){
    for(let productOffer of data.productOffer){
      let x=0
      if(productOffer.discountType==='percentage'){
        x=salePrice*productOffer.discountValue*0.01;
      }else if(productOffer.discountValue<salePrice*.9){
        x=productOffer.discountValue;
      }
      offer=Math.max(x,offer);
    }
  }
  if(data?.categoryOffer?.length>0){
    for(let categoryOffer of data.categoryOffer){
      let x=0
      if(categoryOffer.discountType==='percentage'){
        x=salePrice*categoryOffer.discountValue*0.01;
      }else if (categoryOffer.discountValue < salePrice * 0.9) {
        x = categoryOffer.discountValue;
      }
      offer=Math.max(x,offer);
    }
  }
  return Math.ceil(offer);
}