import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icons from 'react-native-vector-icons/Ionicons';
import {  DARK_BLUE, FONT_FAMILY } from '../util/colors';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store/actions/cartActions';
import { Toast } from 'react-native-toast-notifications';
import { DOMAIN } from '../util/constant';
import UniversalModal from './UniversalModal';
import OpenItemModal from './OpenItemModal';

interface fetchItemProps {
  pageParam: number;
  queryKey: any[];
}
interface ItemSearchModalProps {
  visible: boolean;
  onClose: () => void;
  token: string;
  member: any;
  tableData: any;
  modifiers: any;
  setModifierModal: any;
}
const fetchItems = async ({ pageParam = 1, queryKey }: fetchItemProps) => {
  const [, search, token] = queryKey;
  const response = await fetch(
    `${DOMAIN.LOCAL}staff/group/items/search?search=${search}&page=${pageParam}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  );
  const json = await response.json();
  return json;
};

const ItemSearchModal: React.FC<ItemSearchModalProps> = ({
  visible,
  onClose,
  token,
  member,
  tableData,
  modifiers,
  setModifierModal,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
const cartKey = `${member?.MemberId || ''}/${
  tableData?.location_name || ''
}/${tableData?.table_name || ''}`;

const cart = useSelector(
  state => state?.cart?.cart?.[cartKey] ?? [],
);
  const Modifiers = useSelector(state => state.auth.user?.Modifiers);
  const dispatch = useDispatch();
  const [openItemModal, setOpenItemModal] = useState(null);
  // /${tableData.location_name}/${tableData.table_name}
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500); // waits 500ms after user stops typing
    return () => clearTimeout(timer);
  }, [search]);
  const getDisplayItem = useCallback(
    item => {
      const cartItem = cart?.items?.find(i => i.ItemCode === item.ItemCode);
      return cartItem ? { ...item, ...cartItem } : item;
    },
    [cart.items],
  );
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ['items', debouncedSearch, token],
      queryFn: fetchItems,
      getNextPageParam: lastPage => {
        if (lastPage?.current_page < lastPage?.last_page)
          return lastPage.current_page + 1;
        return undefined;
      },
      enabled: !!debouncedSearch && !!token, // only fetch when search text exists
    });
  const getItemQuantity = itemCode => {
    const found = cart?.items?.find(i => i?.ItemCode === itemCode);
    return found ? found.qty : 0;
  };
  const totalAmount = useMemo(() => {
    return (
      cart?.items?.reduce(
        (sum, item) => sum + (item.qty * parseFloat(item.SP) || 0),
        0,
      ) || 0
    );
  }, [cart?.items]);
  const items = data?.pages?.flatMap(p => p.data) ?? [];
  const renderItem = ({ item }) => {
    const displayItem = getDisplayItem(item);
    const qty = getItemQuantity(item?.ItemCode);
    if (item?.OpenItem) {
    }

    return (
      <Pressable
        disabled={!item?.ModifierAllow}
        onPress={() => {
          setModifierModal(item), onClose();
        }}
        style={styles.card}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, marginRight: 5 }}>
            <Text numberOfLines={1} style={styles.itemName}>
              {displayItem?.Displayas}
            </Text>
            <Text
              style={[
                styles.itemPrice,
                { color: displayItem.OpenItem ? 'red' : '#63748A' },
              ]}
            >
              ₹{displayItem?.SP}
            </Text>
          </View>
          {qty === 0 ? (
            <Pressable
              onPress={() => {
                if (item.OpenItem) {
                  setOpenItemModal(displayItem);
                  onClose();
                  return;
                }
                if (
                  tableData.card_balance <
                  totalAmount + parseFloat(displayItem.SP)
                ) {
                  Alert.alert('', 'Low Balance');
                  return;
                }
                return dispatch(
                  addToCart(
                    `${member?.MemberId}/${tableData.location_name}/${tableData.table_name}`,
                    { ...displayItem, discount: tableData?.KOTDiscount || '0' },
                    tableData,
                  ),
                );
              }}
              style={styles.addButton}
            >
              <Text style={styles.addText}>Add+</Text>
            </Pressable>
          ) : (
            <View style={styles.qtyContainer}>
              <Pressable
                onPress={() =>
                  dispatch(
                    removeFromCart(
                      `${member?.MemberId}/${tableData.location_name}/${tableData.table_name}`,
                      displayItem,
                    ),
                  )
                }
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>−</Text>
              </Pressable>

              <Text style={styles.qtyNumber}>{qty}</Text>

              <Pressable
                onPress={() => {
                  if (
                    tableData.card_balance <
                    totalAmount + parseFloat(item.SP)
                  ) {
                    Alert.alert('', 'Low Balance');
                    return;
                  }
                  dispatch(
                    addToCart(
                      `${member?.MemberId}/${tableData.location_name}/${tableData.table_name}`,
                      { ...item, discount: tableData?.KOTDiscount || '0' },
                      tableData,
                    ),
                  );
                }}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
        {item.Remarks && (
          <Text
            style={{
              backgroundColor: 'red',
              flex: 1,
              marginTop: 5,
              fontFamily: FONT_FAMILY.Muli,
              color: 'grey',
            }}
          >
            Remarks: {item.Remarks}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <OpenItemModal
        visible={openItemModal}
        onClose={() => setOpenItemModal(null)}
        token={token}
        member={member}
        tableData={tableData}
        onAdd={openItem => {
          if (tableData.card_balance < totalAmount + parseFloat(openItem.SP)) {
            Alert.alert('', 'Low Balance');
            return;
          }
          dispatch(
            addToCart(
              `${member.MemberId}/${tableData.location_name}/${tableData.table_name}`,
              { ...openItem, discount: tableData?.KOTDiscount || '0' },
              tableData,
            ),
          );
          setOpenItemModal(null);
          Toast.show('Item added to cart', {
            type: 'success',
          });
        }}
      />
      {/* <Modal visible={visible} animationType="slide" transparent > */}
      <UniversalModal setVisible={onClose} visible={visible} isFull ={true} title='Search items'>
        
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={[styles.input, { flexDirection: 'row' }]}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search item..."
                  style={{
                    flex: 1,
                    padding: 10,
                    fontFamily: FONT_FAMILY.normal,
                    color: 'black',
                  }}
                  placeholderTextColor="#888"
                />
                {isFetching && (
                  <ActivityIndicator
                    style={{ marginRight: 10 }}
                    color={DARK_BLUE}
                    size="small"
                  />
                )}
             {search.length &&!isFetching && <Pressable style={{alignSelf:'center',marginRight:10}} onPress={()=>setSearch('')}>
                <Icons name="close-circle-sharp" size={20} color="grey" />
              </Pressable>}
              </View>
            </View>

            <FlatList
            nestedScrollEnabled={true}
              data={items || []}
              renderItem={renderItem}
              keyExtractor={item => item?.ItemCode.toString()}
              onEndReached={() => hasNextPage && fetchNextPage()}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                !isFetching && (
                  <Text
                    style={{
                      textAlign: 'center',
                      color: '#888',
                      marginTop: 20,
                      fontFamily: FONT_FAMILY.medium,
                    }}
                  >
                    {debouncedSearch
                      ? 'No items found'
                      : 'Type something to search'}
                  </Text>
                )
              }
              ListFooterComponent={
                isFetchingNextPage && (
                  <ActivityIndicator color={DARK_BLUE} size="small" />
                )
              }
            />
          </View>
        </UniversalModal>
    </>
  );
};

export default ItemSearchModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    marginTop:100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    flex: 1,
    paddingHorizontal:15,
    backgroundColor:'#F9FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'white',
    borderWidth:0.5,
    borderColor:'#d6d8db',
    borderRadius: 8,
    color: 'black',
     shadowOpacity:0.08,
    shadowOffset:{
      height:3,
      width:-10
    },
     padding: 4,
  },
  card: {
   
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginVertical: 5,
     borderColor:'#d6d8db',
    borderWidth:0.3,
    elevation:1,
    shadowOpacity:0.08,
    shadowOffset:{
      height:3,
      width:-10
    }
  },
  itemName: {
    color: DARK_BLUE,
    fontFamily: FONT_FAMILY.bold,
  },
  qtyNumber: {
    color: 'black',
    fontFamily: FONT_FAMILY.bold,
  },

  itemPrice: {
    color: DARK_BLUE,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: DARK_BLUE,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addText: {
    color: 'white',
    fontFamily: FONT_FAMILY.bold,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'green',
    paddingHorizontal: 5,
  },
  qtyButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyText: {
    fontSize: 30,
    color: 'green',
    fontFamily: FONT_FAMILY.bold,
  },
  addButton: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderColor: 'green',
    backgroundColor: 'white',
  },
  addText: {
    fontFamily: FONT_FAMILY.bold,
    color: 'green',
    fontSize:20,
  },
});
